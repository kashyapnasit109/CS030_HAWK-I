"""
Generates the interactive HTML viewer for the HAWK-I System Flowchart (Vertical Edition).
"""
import os

def generate_html_viewer():
    with open("diagrams/system-flow-diagram.svg", "r", encoding="utf-8") as f:
        svg_content = f.read()

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HAWK-I — Complete Software Working Flowchart (Vertical Edition)</title>
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0F172A;
      color: #F8FAFC;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }}
    header {{
      background: #1E293B;
      border-bottom: 1px solid #334155;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      z-index: 10;
    }}
    .title-group h1 {{
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #FFFFFF;
    }}
    .title-group p {{
      font-size: 0.8rem;
      color: #94A3B8;
      margin-top: 2px;
    }}
    .btn-group {{
      display: flex;
      gap: 10px;
      align-items: center;
    }}
    button, .btn-link {{
      background: #334155;
      color: #F8FAFC;
      border: 1px solid #475569;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      gap: 6px;
      transition: all 0.15s ease;
    }}
    button:hover, .btn-link:hover {{
      background: #2563EB;
      border-color: #3B82F6;
      color: #FFFFFF;
    }}
    button.primary, .btn-link.primary {{
      background: #2563EB;
      border-color: #3B82F6;
    }}
    button.primary:hover, .btn-link.primary:hover {{
      background: #1D4ED8;
    }}
    #canvas-container {{
      flex: 1;
      overflow: auto;
      background: #0F172A;
      display: flex;
      justify-content: center;
      padding: 30px;
      position: relative;
    }}
    .svg-wrapper {{
      background: #FFFFFF;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border-radius: 8px;
      overflow: hidden;
      transform-origin: top center;
      transition: transform 0.1s ease-out;
      width: 1800px;
      height: 4750px;
    }}
    svg {{
      width: 100%;
      height: 100%;
      display: block;
    }}
    .badge {{
      background: #059669;
      color: #FFFFFF;
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      margin-left: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    @media print {{
      header {{ display: none; }}
      body, #canvas-container {{
        background: #FFFFFF;
        height: auto;
        overflow: visible;
        padding: 0;
      }}
      .svg-wrapper {{
        box-shadow: none;
        width: 100% !important;
        height: auto !important;
        transform: none !important;
      }}
    }}
  </style>
</head>
<body>

  <header>
    <div class="title-group">
      <h1>HAWK-I &mdash; System Working Flowchart <span class="badge">ISO 5807</span></h1>
      <p>Unified AI-Powered CCTV Intelligence Platform &bull; Academic Software Engineering Specification</p>
    </div>
    <div class="btn-group">
      <button onclick="zoomIn()">Zoom In (+)</button>
      <button onclick="zoomOut()">Zoom Out (-)</button>
      <button onclick="resetZoom()">Reset (100%)</button>
      <button onclick="fitWidth()">Fit Width</button>
      <a href="system-flow-diagram.png" download="HAWK-I_System_Flowchart.png" class="btn-link primary">Download PNG (Ultra-HD)</a>
      <a href="system-flow-diagram.jpg" download="HAWK-I_System_Flowchart.jpg" class="btn-link">Download JPG</a>
      <a href="system-flow-diagram.svg" download="HAWK-I_System_Flowchart.svg" class="btn-link">Download SVG</a>
      <button onclick="window.print()">Print Diagram</button>
    </div>
  </header>

  <main id="canvas-container">
    <div class="svg-wrapper" id="diagram-wrapper">
      {svg_content}
    </div>
  </main>

  <script>
    let scale = 1.0;
    const wrapper = document.getElementById('diagram-wrapper');
    const container = document.getElementById('canvas-container');

    function updateZoom() {{
      wrapper.style.transform = `scale(${{scale}})`;
    }}

    function zoomIn() {{
      scale = Math.min(scale + 0.15, 2.5);
      updateZoom();
    }}

    function zoomOut() {{
      scale = Math.max(scale - 0.15, 0.2);
      updateZoom();
    }}

    function resetZoom() {{
      scale = 1.0;
      updateZoom();
    }}

    function fitWidth() {{
      const availableWidth = container.clientWidth - 80;
      scale = Math.max(0.2, Math.min(availableWidth / 1800, 1.5));
      updateZoom();
    }}

    // Initial fit width on load
    window.addEventListener('load', fitWidth);
    window.addEventListener('resize', fitWidth);
  </script>
</body>
</html>"""

    with open("diagrams/system-flow-diagram.html", "w", encoding="utf-8") as f:
        f.write(html)
    with open("docs/architecture/HAWK-I_SYSTEM_FLOW.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Interactive HTML viewers updated successfully.")

if __name__ == "__main__":
    generate_html_viewer()
