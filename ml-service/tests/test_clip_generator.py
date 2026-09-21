"""
Hawk-I ML Service — ClipGenerator Tests
"""

import os
import unittest
import cv2
import numpy as np
from services.clip_generator import ClipGenerator


class TestClipGenerator(unittest.TestCase):

    def setUp(self):
        # Create a synthetic 3-second test video at 25 FPS (75 frames)
        self.test_video_path = "test_synth_video.mp4"
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(self.test_video_path, fourcc, 25.0, (320, 240))

        for i in range(75):
            frame = np.zeros((240, 320, 3), dtype=np.uint8)
            # Draw a moving square
            x = 20 + i * 3
            y = 50 + int(20 * np.sin(i / 5.0))
            cv2.rectangle(frame, (x, y), (x + 30, y + 30), (0, 255, 0), -1)
            out.write(frame)

        out.release()

    def tearDown(self):
        if os.path.exists(self.test_video_path):
            os.remove(self.test_video_path)

    def test_clip_generation_success(self):
        res = ClipGenerator.generate_annotated_clip(
            source_video_path=self.test_video_path,
            event_timestamp_sec=1.5,
            source_module="velocity",
            event_type="speed_violation",
            bounding_box={"x": 50, "y": 50, "w": 40, "h": 40},
            label="CAR #1",
            confidence=0.94,
            extra_telemetry="35.0 km/h",
            pre_seconds=1.0,
            post_seconds=1.0,
            clip_filename_prefix="unittest_clip"
        )

        self.assertIn("file_path", res)
        self.assertIn("thumbnail_path", res)
        self.assertTrue(res["file_path"].startswith("/media/clips/"))
        self.assertTrue(res["thumbnail_path"].startswith("/media/clips/"))
        self.assertTrue(os.path.exists(res["absolute_clip_path"]))
        self.assertTrue(os.path.exists(res["absolute_thumbnail_path"]))
        self.assertGreater(res["file_size_kb"], 0)

        # Cleanup generated clip artifact
        if os.path.exists(res["absolute_clip_path"]):
            os.remove(res["absolute_clip_path"])
        if os.path.exists(res["absolute_thumbnail_path"]):
            os.remove(res["absolute_thumbnail_path"])

    def test_clip_generation_clamped_boundaries(self):
        # Event at start of video (0.2s)
        res = ClipGenerator.generate_annotated_clip(
            source_video_path=self.test_video_path,
            event_timestamp_sec=0.2,
            source_module="threat",
            event_type="loitering",
            pre_seconds=3.0,
            post_seconds=3.0,
            clip_filename_prefix="unittest_clamp"
        )

        self.assertEqual(res["start_time_sec"], 0.0)
        self.assertTrue(os.path.exists(res["absolute_clip_path"]))

        # Cleanup
        if os.path.exists(res["absolute_clip_path"]):
            os.remove(res["absolute_clip_path"])
        if os.path.exists(res["absolute_thumbnail_path"]):
            os.remove(res["absolute_thumbnail_path"])


if __name__ == "__main__":
    unittest.main()
