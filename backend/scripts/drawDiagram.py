import os
import math
from PIL import Image, ImageDraw, ImageFont

def create_drawio_file(output_path):
    print("Generating Draw.io XML file...")
    
    # Coordinates mapping matching the layout
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="Electron" modified="2026-08-10T12:00:00.000Z" agent="Mozilla/5.0" version="21.6.8" type="device">
  <diagram id="hawk-i-use-case" name="Page-1">
    <mxGraphModel dx="1200" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="900" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        
        <!-- System Boundary -->
        <mxCell id="system_boundary" value="HAWK-I CCTV Intelligence Platform" style="shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#B3B3B3;strokeWidth=2;dashed=0;verticalAlign=top;align=center;spacingTop=15;fontSize=16;fontStyle=1;fontColor=#333333;" vertex="1" parent="1">
          <mxGeometry x="250" y="50" width="700" height="800" as="geometry" />
        </mxCell>

        <!-- Actors (Left) -->
        <mxCell id="actor_admin" value="Administrator" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;fontStyle=1;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="80" y="200" width="40" height="80" as="geometry" />
        </mxCell>
        <mxCell id="actor_operator" value="Security Operator" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;fontStyle=1;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="80" y="520" width="40" height="80" as="geometry" />
        </mxCell>

        <!-- Actors (Right) -->
        <mxCell id="actor_supervisor" value="Security Supervisor" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;fontStyle=1;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1080" y="320" width="40" height="80" as="geometry" />
        </mxCell>
        <mxCell id="actor_viewer" value="Viewer" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;fontStyle=1;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1080" y="600" width="40" height="80" as="geometry" />
        </mxCell>

        <!-- Use Cases -->
        <mxCell id="uc_login" value="UC-01 Login" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="510" y="100" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_users" value="UC-02 Manage Users" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="300" y="200" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_cameras" value="UC-03 Manage Cameras" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="300" y="290" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_dashboard" value="UC-04 View Dashboard" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="510" y="380" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_live" value="UC-05 Monitor Live Video" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="510" y="470" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_search" value="UC-06 Search Events" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="300" y="560" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_semantic" value="UC-12 Semantic Search" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="300" y="680" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_details" value="UC-07 View Detection Events" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="510" y="560" width="185" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_alerts" value="UC-08 View Alerts" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="720" y="290" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_resolve" value="UC-09 Acknowledge/Resolve Alert" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="720" y="410" width="200" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_registry" value="UC-10 Manage Vehicle Registry" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="720" y="560" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_evidence" value="UC-11 Review Evidence" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="720" y="670" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="uc_analytics" value="UC-13 View Analytics" style="ellipse;whiteSpace=wrap;html=1;fillColor=#E6F2FF;strokeColor=#0056B3;strokeWidth=1.5;align=center;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="720" y="760" width="180" height="60" as="geometry" />
        </mxCell>

        <!-- Association Lines (Admin) -->
        <mxCell id="edge_admin_login" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_admin" target="uc_login" />
        <mxCell id="edge_admin_users" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_admin" target="uc_users" />
        <mxCell id="edge_admin_cameras" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_admin" target="uc_cameras" />

        <!-- Association Lines (Operator) -->
        <mxCell id="edge_op_login" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_operator" target="uc_login" />
        <mxCell id="edge_op_dash" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_operator" target="uc_dashboard" />
        <mxCell id="edge_op_live" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_operator" target="uc_live" />
        <mxCell id="edge_op_search" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_operator" target="uc_search" />
        <mxCell id="edge_op_details" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_operator" target="uc_details" />
        <mxCell id="edge_op_alerts" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_operator" target="uc_alerts" />
        <mxCell id="edge_op_resolve" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="actor_operator" target="uc_resolve" />

        <!-- Association Lines (Supervisor) -->
        <mxCell id="edge_sup_login" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=0;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_login" target="actor_supervisor" />
        <mxCell id="edge_sup_dash" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_dashboard" target="actor_supervisor" />
        <mxCell id="edge_sup_alerts" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_alerts" target="actor_supervisor" />
        <mxCell id="edge_sup_resolve" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_resolve" target="actor_supervisor" />
        <mxCell id="edge_sup_registry" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_registry" target="actor_supervisor" />
        <mxCell id="edge_sup_evidence" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_evidence" target="actor_supervisor" />
        <mxCell id="edge_sup_analytics" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_analytics" target="actor_supervisor" />

        <!-- Association Lines (Viewer) -->
        <mxCell id="edge_vw_login" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=0;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_login" target="actor_viewer" />
        <mxCell id="edge_vw_dash" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_dashboard" target="actor_viewer" />
        <mxCell id="edge_vw_live" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_live" target="actor_viewer" />
        <mxCell id="edge_vw_alerts" style="endArrow=none;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;exitDx=0;exitDy=0;" edge="1" parent="1" source="uc_alerts" target="actor_viewer" />

        <!-- Dependency / Relationship Lines (dashed with arrows) -->
        <mxCell id="edge_include_semantic" value="&amp;lt;&amp;lt;include&amp;gt;&amp;gt;" style="endArrow=open;endSize=12;dashed=1;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="uc_search" target="uc_semantic" />
        <mxCell id="edge_extend_resolve" value="&amp;lt;&amp;lt;extend&amp;gt;&amp;gt;" style="endArrow=open;endSize=12;dashed=1;html=1;rounded=0;strokeColor=#555555;strokeWidth=1.2;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;" edge="1" parent="1" source="uc_resolve" target="uc_alerts" />

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(xml_content)
    print(f"Draw.io XML successfully saved to {output_path}")

def draw_stick_figure(draw, cx, cy, label, font):
    # Head
    draw.ellipse([cx - 15, cy - 40, cx + 15, cy - 10], fill="#E6F2FF", outline="#0056B3", width=2)
    # Spine
    draw.line([cx, cy - 10, cx, cy + 30], fill="#0056B3", width=2)
    # Arms
    draw.line([cx - 25, cy + 5, cx + 25, cy + 5], fill="#0056B3", width=2)
    # Legs
    draw.line([cx, cy + 30, cx - 15, cy + 60], fill="#0056B3", width=2)
    draw.line([cx, cy + 30, cx + 15, cy + 60], fill="#0056B3", width=2)
    # Label
    text_bbox = draw.textbbox((0, 0), label, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    draw.text((cx - text_w / 2, cy + 70), label, fill="#000000", font=font)

def draw_use_case(draw, cx, cy, w, h, label, font):
    # Oval
    draw.ellipse([cx - w/2, cy - h/2, cx + w/2, cy + h/2], fill="#E6F2FF", outline="#0056B3", width=2)
    # Center text
    lines = label.split(" ")
    y_offset = cy - len(lines) * 8
    for line in lines:
        text_bbox = draw.textbbox((0, 0), line, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        draw.text((cx - text_w / 2, y_offset), line, fill="#000000", font=font)
        y_offset += 16

def draw_arrow(draw, x1, y1, x2, y2, color="#555555", width=1, style="solid"):
    if style == "dashed":
        # Draw a basic dashed line
        dist = math.hypot(x2 - x1, y2 - y1)
        dash_len = 6
        gap_len = 4
        dashes = int(dist / (dash_len + gap_len))
        dx = (x2 - x1) / dist
        dy = (y2 - y1) / dist
        for i in range(dashes):
            start_x = x1 + dx * i * (dash_len + gap_len)
            start_y = y1 + dy * i * (dash_len + gap_len)
            end_x = start_x + dx * dash_len
            end_y = start_y + dy * dash_len
            draw.line([start_x, start_y, end_x, end_y], fill=color, width=width)
    else:
        draw.line([x1, y1, x2, y2], fill=color, width=width)
        
    # Draw arrow head if not none
    # Vector math for arrow head pointing to (x2, y2)
    angle = math.atan2(y2 - y1, x2 - x1)
    arrow_len = 10
    angle_offset = math.radians(20)
    
    ax = x2 - arrow_len * math.cos(angle - angle_offset)
    ay = y2 - arrow_len * math.sin(angle - angle_offset)
    bx = x2 - arrow_len * math.cos(angle + angle_offset)
    by = y2 - arrow_len * math.sin(angle + angle_offset)
    
    draw.polygon([x2, y2, ax, ay, bx, by], fill=color, outline=color)

def generate_use_case_png(output_path):
    print("Generating PNG Use Case Diagram...")
    img = Image.new("RGB", (1200, 900), "#FFFFFF")
    draw = ImageDraw.Draw(img)
    
    # System boundary box
    draw.rectangle([250, 50, 950, 850], outline="#B3B3B3", width=2)
    
    # Fonts loading
    try:
        # Load Arial on Windows
        font = ImageFont.truetype("arial.ttf", 12)
        font_bold = ImageFont.truetype("arialbd.ttf", 14)
        font_title = ImageFont.truetype("arialbd.ttf", 16)
    except:
        font = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_title = ImageFont.load_default()
        
    # System Title
    draw.text((600 - draw.textbbox((0, 0), "HAWK-I CCTV Intelligence Platform", font=font_title)[2]/2, 65), 
              "HAWK-I CCTV Intelligence Platform", fill="#333333", font=font_title)
              
    # Draw Actors
    # Admin (x=100, y=240)
    draw_stick_figure(draw, 100, 240, "Administrator", font_bold)
    # Operator (x=100, y=560)
    draw_stick_figure(draw, 100, 560, "Security Operator", font_bold)
    # Supervisor (x=1100, y=360)
    draw_stick_figure(draw, 1100, 360, "Security Supervisor", font_bold)
    # Viewer (x=1100, y=640)
    draw_stick_figure(draw, 1100, 640, "Viewer", font_bold)

    # Use Cases Dictionary
    use_cases = {
        "login": (600, 130, 180, 60, "UC-01 Login"),
        "users": (390, 230, 180, 60, "UC-02 Manage Users"),
        "cameras": (390, 320, 180, 60, "UC-03 Manage Cameras"),
        "dashboard": (600, 410, 180, 60, "UC-04 View Dashboard"),
        "live": (600, 500, 180, 60, "UC-05 Monitor Live Video"),
        "search": (390, 590, 180, 60, "UC-06 Search Events"),
        "semantic": (390, 710, 180, 60, "UC-12 Semantic Search"),
        "details": (600, 590, 185, 60, "UC-07 View Detection Events"),
        "alerts": (810, 320, 180, 60, "UC-08 View Alerts"),
        "resolve": (810, 440, 200, 60, "UC-09 Acknowledge/Resolve Alert"),
        "registry": (810, 590, 180, 60, "UC-10 Manage Vehicle Registry"),
        "evidence": (810, 700, 180, 60, "UC-11 Review Evidence"),
        "analytics": (810, 790, 180, 60, "UC-13 View Analytics")
    }

    # Draw Use Cases
    for uc, data in use_cases.items():
        draw_use_case(draw, data[0], data[1], data[2], data[3], data[4], font)
        
    # Associations (Simple Solid lines)
    # Admin
    draw.line([120, 240, 300, 230], fill="#555555", width=1) # Users
    draw.line([120, 240, 300, 320], fill="#555555", width=1) # Cameras
    draw.line([120, 240, 510, 130], fill="#555555", width=1) # Login
    
    # Operator
    draw.line([120, 560, 510, 130], fill="#555555", width=1) # Login
    draw.line([120, 560, 510, 410], fill="#555555", width=1) # Dash
    draw.line([120, 560, 510, 500], fill="#555555", width=1) # Live
    draw.line([120, 560, 300, 590], fill="#555555", width=1) # Search
    draw.line([120, 560, 510, 590], fill="#555555", width=1) # Details
    draw.line([120, 560, 720, 320], fill="#555555", width=1) # Alerts
    draw.line([120, 560, 720, 440], fill="#555555", width=1) # Resolve
    
    # Supervisor
    draw.line([1080, 360, 690, 130], fill="#555555", width=1) # Login
    draw.line([1080, 360, 690, 410], fill="#555555", width=1) # Dash
    draw.line([1080, 360, 900, 320], fill="#555555", width=1) # Alerts
    draw.line([1080, 360, 920, 440], fill="#555555", width=1) # Resolve
    draw.line([1080, 360, 900, 590], fill="#555555", width=1) # Registry
    draw.line([1080, 360, 900, 700], fill="#555555", width=1) # Evidence
    draw.line([1080, 360, 900, 790], fill="#555555", width=1) # Analytics
    
    # Viewer
    draw.line([1080, 640, 690, 130], fill="#555555", width=1) # Login
    draw.line([1080, 640, 690, 410], fill="#555555", width=1) # Dash
    draw.line([1080, 640, 690, 500], fill="#555555", width=1) # Live
    draw.line([1080, 640, 900, 320], fill="#555555", width=1) # Alerts
    
    # Dependencies (Dashed lines with arrowheads)
    # Include: Search -> Semantic
    draw_arrow(draw, 390, 620, 390, 680, color="#555555", width=1, style="dashed")
    draw.text((400, 640), "<<include>>", fill="#555555", font=font)
    
    # Extend: Resolve -> Alerts
    draw_arrow(draw, 810, 410, 810, 350, color="#555555", width=1, style="dashed")
    draw.text((820, 375), "<<extend>>", fill="#555555", font=font)
    
    # Save Image
    img.save(output_path)
    print(f"Use case diagram PNG successfully saved to {output_path}")

if __name__ == "__main__":
    diagrams_dir = os.path.join(os.path.dirname(__file__), "../../diagrams")
    if not os.path.exists(diagrams_dir):
        os.makedirs(diagrams_dir)
        print(f"Created diagrams directory at {diagrams_dir}")
        
    drawio_path = os.path.join(diagrams_dir, "use-case-diagram.drawio")
    png_path = os.path.join(diagrams_dir, "use-case-diagram.png")
    
    create_drawio_file(drawio_path)
    generate_use_case_png(png_path)
