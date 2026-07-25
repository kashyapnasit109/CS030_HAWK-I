import cv2
import numpy as np

def compute_hsv_histogram(crop_img):
    """Compute a normalized 3D HSV color histogram of an image crop."""
    if crop_img is None or crop_img.size == 0:
        return None
        
    try:
        # Convert crop to HSV color space
        hsv = cv2.cvtColor(crop_img, cv2.COLOR_BGR2HSV)
        
        # Calculate histogram: 8 Hue bins, 8 Saturation bins, 8 Value bins (512 dimensions)
        hist = cv2.calcHist([hsv], [0, 1, 2], None, [8, 8, 8], [0, 180, 0, 256, 0, 256])
        
        # Normalize the histogram
        cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        return hist.flatten()
    except Exception as e:
        print(f"[reid] Histogram calculation failed: {e}")
        return None

def compute_person_reid_similarity(img1, img2) -> float:
    """
    Compare visual similarity between two person crops.
    Splits crops into upper/lower halves to match shirt/pants colors separately.
    Returns similarity score between 0.0 and 1.0.
    """
    if img1 is None or img2 is None or img1.size == 0 or img2.size == 0:
        return 0.0
        
    try:
        # Resize to standard size (128x256)
        i1 = cv2.resize(img1, (128, 256), interpolation=cv2.INTER_AREA)
        i2 = cv2.resize(img2, (128, 256), interpolation=cv2.INTER_AREA)
        
        # Split upper body (torso) and lower body (legs)
        u1 = i1[0:128, :]
        l1 = i1[128:, :]
        
        u2 = i2[0:128, :]
        l2 = i2[128:, :]
        
        # Compute histograms
        u1_hist = compute_hsv_histogram(u1)
        l1_hist = compute_hsv_histogram(l1)
        
        u2_hist = compute_hsv_histogram(u2)
        l2_hist = compute_hsv_histogram(l2)
        
        if u1_hist is None or l1_hist is None or u2_hist is None or l2_hist is None:
            return 0.0
            
        # Cosine similarity for upper body and lower body histograms
        def cosine_similarity(v1, v2):
            dot = np.dot(v1, v2)
            norm = np.linalg.norm(v1) * np.linalg.norm(v2)
            return float(dot / norm) if norm > 0 else 0.0
            
        sim_upper = cosine_similarity(u1_hist, u2_hist)
        sim_lower = cosine_similarity(l1_hist, l2_hist)
        
        # Average upper and lower body similarity
        return (sim_upper * 0.55) + (sim_lower * 0.45)
    except Exception as e:
        print(f"[reid] Similarity check error: {e}")
        return 0.0

def compute_vehicle_reid_similarity(img1, img2) -> float:
    """Compare similarity of two vehicle crops using structural and color metrics."""
    if img1 is None or img2 is None or img1.size == 0 or img2.size == 0:
        return 0.0
        
    try:
        # Resize to standard size (256x128)
        i1 = cv2.resize(img1, (256, 128), interpolation=cv2.INTER_AREA)
        i2 = cv2.resize(img2, (256, 128), interpolation=cv2.INTER_AREA)
        
        h1 = compute_hsv_histogram(i1)
        h2 = compute_hsv_histogram(i2)
        
        if h1 is None or h2 is None:
            return 0.0
            
        dot = np.dot(h1, h2)
        norm = np.linalg.norm(h1) * np.linalg.norm(h2)
        return float(dot / norm) if norm > 0 else 0.0
    except Exception:
        return 0.0
