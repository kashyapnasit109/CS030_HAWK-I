import os
from pathlib import Path
import torch
from facenet_pytorch import InceptionResnetV1
from ultralytics import YOLO

BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "storage" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# 1. Convert FaceNet to ONNX
print("Loading FaceNet InceptionResnetV1 model...")
try:
    facenet_model = InceptionResnetV1(pretrained="vggface2").eval()
    dummy_input = torch.randn(1, 3, 160, 160)
    facenet_onnx_path = MODELS_DIR / "facenet.onnx"
    print(f"Exporting FaceNet to ONNX: {facenet_onnx_path}...")
    torch.onnx.export(
        facenet_model,
        dummy_input,
        str(facenet_onnx_path),
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        opset_version=12
    )
    print("FaceNet exported successfully!")
except Exception as e:
    print(f"Error exporting FaceNet: {e}")

# 2. Convert YOLOv8-face-keypoints to ONNX
yolo_pt_path = BASE_DIR.parent / "Face-Detection-and-Recognition-with-YOLOv8-and-FaceNet-PyTorch-main" / "yolov8n-face-keypoints.pt"
if yolo_pt_path.exists():
    print(f"Loading YOLOv8 face keypoints model from {yolo_pt_path}...")
    try:
        yolo_model = YOLO(str(yolo_pt_path))
        print("Exporting YOLOv8 to ONNX...")
        # Exporting to ONNX format (ultralytics automatically exports to .onnx in the same folder as the .pt model)
        onnx_file_path = yolo_model.export(format="onnx")
        print(f"YOLOv8 exported to ONNX: {onnx_file_path}")
        
        # Copy to storage/models for central access
        dest_path = MODELS_DIR / "yolov8n-face-keypoints.onnx"
        import shutil
        shutil.copy2(onnx_file_path, dest_path)
        print(f"Copied YOLOv8 ONNX to {dest_path}")
    except Exception as e:
        print(f"Error exporting YOLOv8: {e}")
else:
    print(f"YOLOv8 face keypoints model not found at {yolo_pt_path}")
