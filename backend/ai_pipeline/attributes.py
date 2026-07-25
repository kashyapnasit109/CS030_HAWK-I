import cv2
import numpy as np

def classify_hsv_color(h, s, v):
    """Classify a color based on its HSV values into standard visual colors."""
    if v < 40:
        return "black"
    if s < 40 and v > 150:
        return "white"
    if s < 45 and v >= 40:
        return "gray"
        
    # Hue ranges (0-180 in OpenCV)
    if h < 8 or h > 172:
        return "red"
    elif h < 22:
        return "orange"
    elif h < 38:
        return "yellow"
    elif h < 75:
        return "green"
    elif h < 130:
        return "blue"
    elif h < 160:
        return "purple"
    else:
        return "pink"

def get_dominant_color(crop_img):
    """Calculate the dominant color of an image crop using average HSV values."""
    if crop_img is None or crop_img.size == 0:
        return "gray"
        
    try:
        # Resize to speed up calculation
        small = cv2.resize(crop_img, (16, 16), interpolation=cv2.INTER_AREA)
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        
        # Calculate mean Hue, Saturation, Value
        mean_h = int(np.mean(hsv[:, :, 0]))
        mean_s = int(np.mean(hsv[:, :, 1]))
        mean_v = int(np.mean(hsv[:, :, 2]))
        
        return classify_hsv_color(mean_h, mean_s, mean_v)
    except Exception:
        return "gray"

def extract_person_attributes(frame, bbox, overlapping_labels=None) -> dict:
    """
    Extract clothing colors, headgear, pose, and bag presence for a person bounding box.
    bbox: [x1, y1, x2, y2] absolute coordinates.
    overlapping_labels: list of strings of other objects detected near this person.
    """
    x1, y1, x2, y2 = map(int, bbox)
    height = y2 - y1
    width = x2 - x1
    
    if height <= 0 or width <= 0:
        return {
            "top_color": "gray",
            "bottom_color": "gray",
            "headgear": "none",
            "bag_present": False,
            "pose_state": "standing",
            "confidence": 0.8
        }
        
    crop = frame[y1:y2, x1:x2]
    
    # Segment crops
    # Top 15% is head
    head_h = int(height * 0.15)
    # Upper body is 15% to 50%
    upper_h = int(height * 0.50)
    
    head_crop = crop[0:head_h, :] if head_h > 0 else None
    upper_crop = crop[head_h:upper_h, :] if upper_h > head_h else None
    lower_crop = crop[upper_h:, :] if height > upper_h else None
    
    # 1. Clothing Colors
    top_color = get_dominant_color(upper_crop)
    bottom_color = get_dominant_color(lower_crop)
    
    # 2. Pose estimation based on aspect ratio
    aspect_ratio = height / width
    if aspect_ratio > 1.9:
        pose_state = "standing"
    elif aspect_ratio < 1.3:
        pose_state = "crouching"
    else:
        pose_state = "running" # intermediate state
        
    # 3. Headgear heuristic: check if head crop has highly saturated yellow/red/orange (common helmet colors)
    headgear = "none"
    if head_crop is not None and head_crop.size > 0:
        try:
            head_hsv = cv2.cvtColor(head_crop, cv2.COLOR_BGR2HSV)
            # Threshold for highly saturated pixels (helmets/caps)
            sat_pixels = np.sum(head_hsv[:, :, 1] > 120)
            total_pixels = head_crop.shape[0] * head_crop.shape[1]
            if sat_pixels / total_pixels > 0.35:
                headgear = "helmet"
            elif sat_pixels / total_pixels > 0.15:
                headgear = "cap"
        except Exception:
            pass
            
    # 4. Bag presence: check if backpack/handbag/bag labels overlap this track
    bag_present = False
    if overlapping_labels:
        bag_keywords = ["backpack", "handbag", "suitcase", "bag"]
        bag_present = any(kw in label.lower() for label in overlapping_labels for kw in bag_keywords)
        
    return {
        "top_color": top_color,
        "bottom_color": bottom_color,
        "headgear": headgear,
        "bag_present": bag_present,
        "pose_state": pose_state,
        "confidence": 0.85
    }
