"""
Unit tests for VideoIngestor pipeline using Python unittest.
"""

import os
import tempfile
import unittest
import cv2
import numpy as np
from services.video_pipeline import VideoIngestor, VideoIngestionError


class TestVideoPipeline(unittest.TestCase):

    def setUp(self):
        """Generate a synthetic 1-second 30 FPS video clip for testing."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            self.video_path = tmp.name

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(self.video_path, fourcc, 30.0, (320, 240))
        for i in range(30):
            frame = np.zeros((240, 320, 3), dtype=np.uint8)
            cv2.rectangle(frame, (10 + i * 5, 10), (50 + i * 5, 50), (0, 255, 0), -1)
            out.write(frame)
        out.release()

    def tearDown(self):
        if os.path.exists(self.video_path):
            try:
                os.remove(self.video_path)
            except Exception:
                pass

    def test_video_ingestor_properties(self):
        with VideoIngestor(self.video_path, processing_fps=5.0) as ingestor:
            self.assertEqual(ingestor.native_fps, 30.0)
            self.assertEqual(ingestor.total_frames, 30)
            self.assertEqual(round(ingestor.duration_sec, 1), 1.0)
            self.assertEqual(ingestor.width, 320)
            self.assertEqual(ingestor.height, 240)
            self.assertEqual(ingestor.processing_fps, 5.0)

            meta = ingestor.get_metadata()
            self.assertEqual(meta["native_fps"], 30.0)
            self.assertEqual(meta["processing_fps"], 5.0)
            self.assertEqual(meta["total_frames"], 30)

    def test_video_ingestor_frame_sampling(self):
        with VideoIngestor(self.video_path, processing_fps=5.0) as ingestor:
            sampled_frames = list(ingestor.iter_frames())
            # At 30 native FPS sampled at 5 FPS, step is 6 -> frames 0, 6, 12, 18, 24 = 5 frames
            self.assertEqual(len(sampled_frames), 5)
            
            for sampled_idx, (frame, idx, orig_idx, timestamp) in enumerate(sampled_frames):
                self.assertEqual(frame.shape, (240, 320, 3))
                self.assertEqual(idx, sampled_idx)
                self.assertEqual(orig_idx, sampled_idx * 6)
                self.assertTrue(timestamp >= 0.0)

    def test_video_ingestor_duration_validation(self):
        # Setting max_duration_sec to 0.5s should reject a 1.0s video
        with self.assertRaises(VideoIngestionError) as ctx:
            with VideoIngestor(self.video_path, max_duration_sec=0.5):
                pass
        self.assertIn("exceeds maximum allowed limit", str(ctx.exception))

    def test_video_ingestor_bytes_source(self):
        with open(self.video_path, "rb") as f:
            video_bytes = f.read()

        with VideoIngestor(video_bytes, filename="memory_clip.mp4", processing_fps=10.0) as ingestor:
            self.assertEqual(ingestor.total_frames, 30)
            temp_path = ingestor.get_video_path()
            self.assertTrue(os.path.exists(temp_path))

        # Verify temp file is cleaned up after context exit
        self.assertFalse(os.path.exists(temp_path))


if __name__ == "__main__":
    unittest.main()
