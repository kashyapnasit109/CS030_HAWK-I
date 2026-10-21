import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import shutil
import os

def build_presentation():
    # Load from backup to have clean starting template with logos
    src_file = 'iCreate_Pitch_Deck_Sample_Backup.pptx'
    if not os.path.exists(src_file):
        src_file = 'iCreate_Pitch_Deck_Sample.pptx'
    
    prs = pptx.Presentation(src_file)
    
    # Colors
    NAVY_PRIMARY = RGBColor(27, 54, 93)     # #1B365D
    BLUE_ACCENT = RGBColor(31, 110, 165)    # #1F6EA5
    DARK_CHARCOAL = RGBColor(35, 39, 45)    # #23272D
    MUTED_GRAY = RGBColor(90, 100, 110)     # #5A646E
    WHITE = RGBColor(255, 255, 255)
    LIGHT_BG = RGBColor(246, 248, 251)      # #F6F8FB
    GREEN_ACCENT = RGBColor(20, 120, 60)
    
    # Helper to style a title
    def format_title(shape, text, font_size=28):
        shape.text = text
        tf = shape.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.font.name = 'Times New Roman'
        p.font.size = Pt(font_size)
        p.font.bold = True
        p.font.color.rgb = NAVY_PRIMARY
        p.alignment = PP_ALIGN.LEFT
        return p

    # Helper to add styled paragraphs
    def add_bullet(tf, bold_prefix, text, font_size=13, space_after=6, level=0):
        p = tf.add_paragraph()
        p.level = level
        p.space_after = Pt(space_after)
        p.space_before = Pt(2)
        p.line_spacing = 1.15
        if bold_prefix:
            r_b = p.add_run()
            r_b.text = bold_prefix
            r_b.font.name = 'Times New Roman'
            r_b.font.size = Pt(font_size)
            r_b.font.bold = True
            r_b.font.color.rgb = DARK_CHARCOAL
        r = p.add_run()
        r.text = text
        r.font.name = 'Times New Roman'
        r.font.size = Pt(font_size)
        r.font.color.rgb = DARK_CHARCOAL
        return p

    # ==========================================
    # SLIDE 1: Title Slide
    # ==========================================
    s1 = prs.slides[0]
    # Shape 0: Title 1
    t_shape = s1.shapes[0]
    t_shape.text = "VIGINT"
    p_t = t_shape.text_frame.paragraphs[0]
    p_t.font.name = 'Times New Roman'
    p_t.font.size = Pt(40)
    p_t.font.bold = True
    p_t.font.color.rgb = NAVY_PRIMARY
    p_t.alignment = PP_ALIGN.CENTER
    
    p_t_sub = t_shape.text_frame.add_paragraph()
    p_t_sub.text = "Autonomous Multi-Sensor IoT Mesh & Edge Embedded System for Real-Time Campus Hazard Detection & Physical Countermeasures"
    p_t_sub.font.name = 'Times New Roman'
    p_t_sub.font.size = Pt(14)
    p_t_sub.font.bold = True
    p_t_sub.font.color.rgb = BLUE_ACCENT
    p_t_sub.alignment = PP_ALIGN.CENTER
    p_t_sub.space_before = Pt(6)

    # Shape 1: Subtitle 2 (Prepared By)
    sub_shape = s1.shapes[1]
    tf_sub = sub_shape.text_frame
    tf_sub.clear()
    
    p_prep = tf_sub.paragraphs[0]
    p_prep.text = "Prepared By:"
    p_prep.font.name = 'Times New Roman'
    p_prep.font.size = Pt(14)
    p_prep.font.bold = True
    p_prep.font.color.rgb = NAVY_PRIMARY
    
    p_team1 = tf_sub.add_paragraph()
    p_team1.text = "• Hitansh Parikh (Lead AI & Embedded Systems Architect - 22BCP142)"
    p_team1.font.name = 'Times New Roman'
    p_team1.font.size = Pt(12)
    p_team1.font.color.rgb = DARK_CHARCOAL
    
    p_team2 = tf_sub.add_paragraph()
    p_team2.text = "• Embedded & IoT Systems Engineer (22BEC088)"
    p_team2.font.name = 'Times New Roman'
    p_team2.font.size = Pt(12)
    p_team2.font.color.rgb = DARK_CHARCOAL

    p_team3 = tf_sub.add_paragraph()
    p_team3.text = "• Edge Vision & AI Developer (22BCP165)"
    p_team3.font.name = 'Times New Roman'
    p_team3.font.size = Pt(12)
    p_team3.font.color.rgb = DARK_CHARCOAL

    p_team4 = tf_sub.add_paragraph()
    p_team4.text = "• Hardware Prototyping & PCB Design Lead (22BEE054)"
    p_team4.font.name = 'Times New Roman'
    p_team4.font.size = Pt(12)
    p_team4.font.color.rgb = DARK_CHARCOAL

    # Shape 5: Guided By (TextBox 6)
    if len(s1.shapes) >= 6:
        g_shape = s1.shapes[5]
        tf_g = g_shape.text_frame
        tf_g.clear()
        p_g = tf_g.paragraphs[0]
        p_g.text = "Guided By:"
        p_g.font.name = 'Times New Roman'
        p_g.font.size = Pt(13)
        p_g.font.bold = True
        p_g.font.color.rgb = NAVY_PRIMARY
        
        p_g2 = tf_g.add_paragraph()
        p_g2.text = "Dr. S. K. Sharma\nProfessor & Head of Department\nComputer Science & Engineering"
        p_g2.font.name = 'Times New Roman'
        p_g2.font.size = Pt(11)
        p_g2.font.color.rgb = DARK_CHARCOAL

    # ==========================================
    # SLIDE 2: Outline of Presentation
    # ==========================================
    s2 = prs.slides[1]
    format_title(s2.shapes[0], "Outline of Presentation")
    tf2 = s2.shapes[1].text_frame
    tf2.clear()
    
    agenda_items = [
        ("01. Motivation & Background", "Real-world safety hazards, human monitoring fatigue, and the need for autonomous edge sensing."),
        ("02. Problem Statement & Current Gaps", "Vulnerabilities of passive CCTV, delayed alarms, high commercial costs, and cloud dependency."),
        ("03. Proposed Solution & Architecture", "VIGINT Tri-Modal IoT mesh, Dempster-Shafer sensor fusion, and FreeRTOS dual-core edge processing."),
        ("04. Comparison & Core Uniqueness", "Quantitative benchmarking against standalone CCTV, conventional smoke alarms, and commercial BMS."),
        ("05. Real-World Applications", "Target deployment verticals: Academic campuses, research laboratories, public transit, and server rooms."),
        ("06. Budget Justification (₹30,000 Ask)", "100% tangible IoT hardware breakdown with 50% advance structure (₹15,000 upfront for M1 & M2)."),
        ("07. 1-Year Milestones & Execution Timeline", "6 structured 2-month milestones spanning 1,000 engineering hours from breadboard to campus testbed."),
        ("08. Conclusion & Demonstration Plan", "Summary of feasibility, deliverables, and Q&A discussion.")
    ]
    
    for prefix, desc in agenda_items:
        add_bullet(tf2, f"{prefix}: ", desc, font_size=12, space_after=4)

    # ==========================================
    # SLIDE 3: Motivation
    # ==========================================
    s3 = prs.slides[2]
    format_title(s3.shapes[0], "Motivation: Why Conventional Safety Systems Fail")
    tf3 = s3.shapes[1].text_frame
    tf3.clear()
    
    add_bullet(tf3, "1. Operator Cognitive Fatigue in CCTV: ", "Studies show that security operators miss up to 67% of visual anomalies after just 20 minutes of continuous screen viewing, creating severe blind spots in large campuses.", font_size=13, space_after=8)
    add_bullet(tf3, "2. Blindness to Invisible Non-Optical Hazards: ", "Cameras cannot detect odorless, colorless toxic Carbon Monoxide (CO), pressurized LPG gas leaks, or pre-combustion thermal build-ups before open flames erupt.", font_size=13, space_after=8)
    add_bullet(tf3, "3. High False-Alarm Rates & Ceiling Delay: ", "Conventional smoke alarms have a 120–300 second lag in high-ceiling halls and suffer from 18%–25% false alarms from dust/steam, breeding dangerous complacency.", font_size=13, space_after=8)
    add_bullet(tf3, "4. Lack of Sub-Second Physical Mitigation: ", "Traditional alarms only buzz; they rely on slow human intervention to shut off gas pipelines, sound directional evacuation sirens, or unlock emergency fire exit turnstiles.", font_size=13, space_after=8)
    add_bullet(tf3, "5. The VIGINT Vision: ", "An ultra-low-cost (< ₹1,800/node) edge-first IoT mesh that achieves zero false alarms (<1.8%) and executes physical safety countermeasures in under 250 milliseconds.", font_size=13, space_after=4)

    # ==========================================
    # SLIDE 4: Introduction (1) - Problem Statement & Current Gaps
    # ==========================================
    s4 = prs.slides[3]
    format_title(s4.shapes[0], "Introduction (1): Problem Statement & Market Gaps")
    tf4 = s4.shapes[1].text_frame
    tf4.clear()

    add_bullet(tf4, "• Disconnected, Siloed Safety Infrastructure: ", "CCTV surveillance, fire alarms, and building access controls operate as isolated systems with zero cross-sensor communication or automated consensus validation.", font_size=13, space_after=8)
    add_bullet(tf4, "• Critical Incident Response Latency: ", "Manual verification and security guard dispatch take 5 to 15 minutes, allowing localized electrical smoldering and flammable gas leaks to escalate into major disasters.", font_size=13, space_after=8)
    add_bullet(tf4, "• Exorbitant Commercial Deployment Costs: ", "Enterprise Building Management Systems (Honeywell, Siemens, Milestone) cost upwards of ₹1,50,000 per zone with proprietary, closed-source hardware lock-in.", font_size=13, space_after=8)
    add_bullet(tf4, "• Cloud-Dependency & Network Fragility: ", "Cloud-reliant AI video analytics fail completely when local Wi-Fi or wide-area network (WAN) cables are damaged during an emergency, leaving facilities unprotected.", font_size=13, space_after=8)
    add_bullet(tf4, "• The Need: ", "A self-contained, air-gapped embedded edge platform that operates autonomously on local power and mesh communication with deterministic sub-second reliability.", font_size=13, space_after=4)

    # ==========================================
    # SLIDE 5: Introduction (2) - Proposed VIGINT Multi-Sensor Edge Solution
    # ==========================================
    s5 = prs.slides[4]
    format_title(s5.shapes[0], "Introduction (2): Proposed VIGINT Multi-Sensor Solution")
    tf5 = s5.shapes[1].text_frame
    tf5.clear()

    add_bullet(tf5, "1. Tri-Modal Sensory Transduction Mesh: ", "Distributed ESP32-S3 microcontroller nodes polling MQ-2 (gas/smoke), MQ-7 (toxic CO), DHT22 (temp/humidity), LM393 (acoustic decibel), and ESP32-CAM (edge vision) at 2 Hz with 12-bit ADC precision.", font_size=12.5, space_after=6)
    add_bullet(tf5, "2. Dempster-Shafer Evidential Fusion Engine: ", "Combines optical bounding-box confidence with real-time physical ppm gas and thermal rate-of-rise telemetry. An emergency is confirmed only when optical and physical sensors agree (Bel >= 0.85), reducing false alarms to < 1.8%.", font_size=12.5, space_after=6)
    add_bullet(tf5, "3. Sub-250ms Autonomous Physical Countermeasures: ", "Optocoupled 4-channel relay boards execute localized mitigation in < 130 ms: triggering 110 dB directional strobe sirens, closing 12V solenoid gas shutoff valves, and unlocking electromagnetic fire doors.", font_size=12.5, space_after=6)
    add_bullet(tf5, "4. 100% Offline Air-Gapped Mesh Resilience: ", "Runs autonomously over local 2.4 GHz MQTT with NRF24L01+ RF mesh failover and dual 18650 Li-ion battery backup—zero cloud dependency and 100% operational during network outages.", font_size=12.5, space_after=6)
    add_bullet(tf5, "5. FreeRTOS Dual-Core Architecture: ", "Core 0 handles mesh communication and MQTT telemetry buffering; Core 1 performs deterministic analog reading and FIR noise filtering to guarantee zero frame drops.", font_size=12.5, space_after=4)

    # ==========================================
    # SLIDE 6: Comparison of Uniqueness
    # ==========================================
    s6 = prs.slides[5]
    format_title(s6.shapes[0], "Comparison of Uniqueness: Why VIGINT is Superior")
    
    # Remove default placeholder text frame and add a clean table
    s6.shapes[1].text_frame.clear()
    
    # Let's add a structured table on slide 6
    left = Inches(0.8)
    top = Inches(1.8)
    width = Inches(11.7)
    height = Inches(4.8)
    
    table_shape = s6.shapes.add_table(rows=7, cols=5, left=left, top=top, width=width, height=height)
    table = table_shape.table
    
    # Set column widths
    table.columns[0].width = Inches(2.2)
    table.columns[1].width = Inches(2.2)
    table.columns[2].width = Inches(2.2)
    table.columns[3].width = Inches(2.5)
    table.columns[4].width = Inches(2.6)

    table_data = [
        ["Feature / Metric", "Standalone CCTV", "Legacy Smoke Alarms", "Commercial BMS (PLC)", "VIGINT Platform (Our Solution)"],
        ["Sensing Modalities", "Optical video only (blind to gas/heat)", "Single-point gas or optical smoke", "Multi-point wired industrial sensors", "Tri-Modal: Optical + Multi-Gas/Thermal + Acoustic"],
        ["False Alarm Rate (P_fa)", "High (18% - 25% on glare/shadows)", "Moderate (12% - 16% on dust/steam)", "Low to Moderate (5% - 8%)", "< 1.8% (Dempster-Shafer Evidential Fusion)"],
        ["Hazard Detection Latency", "> 60 - 180 sec (human dependent)", "120 - 300 sec (high-ceiling lag)", "15 - 45 sec (wired bus polling)", "< 250 ms (Local Edge Interrupt Loop)"],
        ["Automated Physical Action", "None (Manual operator dispatch)", "Local buzzer only (no isolation)", "Complex PLC relay (high latency)", "Instant Tri-Actuator: 110dB Siren + Gas Valve + Door"],
        ["Air-Gapped Local Autonomy", "Fails if LAN/NVR disconnects", "Isolated unit (no spatial mesh)", "Requires central master controller", "100% Autonomous Local MQTT Mesh & Battery"],
        ["Hardware Cost Per Zone", "₹8,000 - ₹15,000 (Camera only)", "₹3,500 - ₹6,000 (Basic alarm)", "₹85,000 - ₹1,50,000+ (Industrial PLC)", "< ₹1,800 (Modular Custom Edge IoT Node)"]
    ]

    for r_idx, row_content in enumerate(table_data):
        for c_idx, cell_value in enumerate(row_content):
            cell = table.cell(r_idx, c_idx)
            cell.text = cell_value
            p = cell.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER if (c_idx > 0 or r_idx == 0) else PP_ALIGN.LEFT
            p.font.name = 'Times New Roman'
            if r_idx == 0:
                p.font.size = Pt(11)
                p.font.bold = True
                p.font.color.rgb = WHITE
                cell.fill.solid()
                cell.fill.fore_color.rgb = NAVY_PRIMARY
            else:
                p.font.size = Pt(9.5)
                if c_idx == 4:
                    p.font.bold = True
                    p.font.color.rgb = NAVY_PRIMARY
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = RGBColor(230, 245, 235) # Light green highlight
                else:
                    p.font.color.rgb = DARK_CHARCOAL
                    if r_idx % 2 == 1:
                        cell.fill.solid()
                        cell.fill.fore_color.rgb = LIGHT_BG

    # ==========================================
    # SLIDE 7: Application
    # ==========================================
    s7 = prs.slides[6]
    format_title(s7.shapes[0], "Application: Real-World Deployments & High-Impact Verticals")
    tf7 = s7.shapes[1].text_frame
    tf7.clear()

    add_bullet(tf7, "1. Academic Campuses & Student Hostels: ", "Protects student living areas, mess halls, and chemistry laboratories against toxic gas leaks, unattended kitchen flare-ups, and nighttime corridor stampedes with automatic siren and door releases.", font_size=12.5, space_after=7)
    add_bullet(tf7, "2. Industrial Workshops & Manufacturing Labs: ", "Monitors hazardous flammable hydrocarbons (LPG) and toxic Carbon Monoxide (CO) near CNC machines and welding stations, triggering instant brass solenoid valve shutoffs to stop gas flow at the source.", font_size=12.5, space_after=7)
    add_bullet(tf7, "3. High-Transit Public Infrastructure (Auditoriums, Terminals): ", "Acoustic decibel sensors paired with optical motion estimation detect crowd panics, crushes, and localized brawls, unlocking turnstiles and playing directional PA alerts.", font_size=12.5, space_after=7)
    add_bullet(tf7, "4. Server Data Centers & Electrical Control Rooms: ", "Early detection of smoldering insulation wire heat anomalies and smoke before open flames ignite, cutting electrical relays and notifying maintenance teams in sub-seconds.", font_size=12.5, space_after=7)
    add_bullet(tf7, "5. Scalable Market Impact: ", "Modular plug-and-play architecture enables any institution to deploy advanced edge safety across 50+ zones at less than 10% of traditional commercial retrofitting budgets.", font_size=12.5, space_after=4)

    # ==========================================
    # SLIDE 8: Budget Justification
    # ==========================================
    s8 = prs.slides[7]
    format_title(s8.shapes[0], "Budget Justification: ₹30,000 INR Hardware Ask (50% Advance)")
    
    s8.shapes[1].text_frame.clear()
    
    # Add structured 2-column table for Phase 1 (Advance) vs Phase 2 (Subsequent)
    left8 = Inches(0.8)
    top8 = Inches(1.8)
    width8 = Inches(11.7)
    height8 = Inches(4.9)
    
    tbl_b = s8.shapes.add_table(rows=8, cols=4, left=left8, top=top8, width=width8, height=height8).table
    tbl_b.columns[0].width = Inches(0.8)
    tbl_b.columns[1].width = Inches(3.2)
    tbl_b.columns[2].width = Inches(6.2)
    tbl_b.columns[3].width = Inches(1.5)

    budget_rows = [
        ["Phase", "Milestone Focus", "Itemized Hardware Deliverables & Indian Market Specs", "Cost (INR)"],
        ["50% ADVANCE", "M1: Compute & Nodes", "3x ESP32-S3 Dual-Core N16R8 MCUs + 2x NodeMCU ESP8266 + 2x ESP32-CAM AI Vision Modules", "₹4,650"],
        ["50% ADVANCE", "M1: Multi-Sensor Pack", "3x MQ-2 (Gas/Smoke), 2x MQ-7 (CO), 3x DHT22 (Temp), 3x Acoustic Mics, 4x PIR, 3x Ultrasonic", "₹3,920"],
        ["50% ADVANCE", "M1-M2: Bench & Power", "12V 5A DC PSU, 3x 5V Adapters, 24MHz Logic Analyzer + Multimeter, 4x 18650 Cells, 2x BMS, Buck Regulators", "₹6,430"],
        ["ADVANCE TOTAL", "Subtotal: Phase 1 (M1 & M2)", "Core Microcontrollers, Multi-Hazard Sensors, Testbench Instrumentation & Power Management", "₹15,000"],
        ["TRANCHE 2-3", "M3-M4: PCB & Actuators", "10x Custom 2-Layer FR4 PCBs + Stencil + 2x Relays + 12V Solenoid Valve + 12V Lock + 2x 110dB Sirens", "₹8,050"],
        ["TRANCHE 3-5", "M4-M6: Mesh & Enclosures", "2x NRF24L01+ RF Modules, 4x 5dBi Antennas, 8-Port Switch, 4x IP65 Enclosures + Sealed Calibration Rig", "₹6,950"],
        ["GRAND TOTAL", "Total 1-Year Project Budget", "100% Dedicated to Tangible Embedded IoT Hardware, Sensors, PCBs & Actuation Components", "₹30,000"]
    ]

    for r_idx, row_content in enumerate(budget_rows):
        for c_idx, cell_value in enumerate(row_content):
            cell = tbl_b.cell(r_idx, c_idx)
            cell.text = cell_value
            p = cell.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.RIGHT if c_idx == 3 else (PP_ALIGN.CENTER if c_idx == 0 else PP_ALIGN.LEFT)
            p.font.name = 'Times New Roman'
            if r_idx == 0:
                p.font.size = Pt(11)
                p.font.bold = True
                p.font.color.rgb = WHITE
                cell.fill.solid()
                cell.fill.fore_color.rgb = NAVY_PRIMARY
            elif r_idx in (4, 7): # Subtotal and Grand total
                p.font.size = Pt(10.5)
                p.font.bold = True
                if r_idx == 7:
                    p.font.color.rgb = RGBColor(20, 90, 50)
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = RGBColor(212, 239, 223) # Light green
                else:
                    p.font.color.rgb = NAVY_PRIMARY
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = RGBColor(234, 236, 238) # Light gray
            else:
                p.font.size = Pt(9.5)
                p.font.color.rgb = DARK_CHARCOAL
                if r_idx % 2 == 1:
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = LIGHT_BG

    # ==========================================
    # SLIDE 9: Time Line
    # ==========================================
    s9 = prs.slides[8]
    format_title(s9.shapes[0], "Time Line: 1-Year Execution Road-map (6 Milestones / 1,000 Hours)")
    
    s9.shapes[1].text_frame.clear()

    left9 = Inches(0.8)
    top9 = Inches(1.8)
    width9 = Inches(11.7)
    height9 = Inches(4.9)
    
    tbl_t = s9.shapes.add_table(rows=7, cols=5, left=left9, top=top9, width=width9, height=height9).table
    tbl_t.columns[0].width = Inches(1.2)
    tbl_t.columns[1].width = Inches(1.5)
    tbl_t.columns[2].width = Inches(5.8)
    tbl_t.columns[3].width = Inches(1.4)
    tbl_t.columns[4].width = Inches(1.8)

    timeline_rows = [
        ["Milestone", "Timeline", "Core Engineering Deliverables & Work Description", "Effort", "Funding Tranche"],
        ["Milestone 1", "Months 1 – 2", "Procure core MCUs, primary sensors, and power test bench. Establish breadboard testbed and verify FreeRTOS toolchain.", "160 Hours", "50% Advance (₹15,000)"],
        ["Milestone 2", "Months 3 – 4", "Multi-sensor analog calibration, digital FIR noise filtering, logarithmic PPM curve regression, and 18650 Li-ion BMS power testing.", "180 Hours", "Advance Phase"],
        ["Milestone 3", "Months 5 – 6", "Design 2-layer FR4 PCB in KiCad. Fabricate prototype batch, assemble SMT/DIP headers, and integrate 12V solenoid gas valve & sirens.", "170 Hours", "Tranche 2 (₹5,560)"],
        ["Milestone 4", "Months 7 – 8", "Interface ESP32-CAM nodes with local MQTT broker. Implement Dempster-Shafer evidential fusion logic and NRF24L01+ RF fallback mesh.", "190 Hours", "Tranche 3 (₹5,020)"],
        ["Milestone 5", "Months 9 – 10", "Assemble nodes in IP65 weatherproof ABS industrial enclosures. Execute controlled smoke/gas stress tests in sealed calibration chamber.", "160 Hours", "Tranche 4 (₹2,450)"],
        ["Milestone 6", "Months 11 – 12", "Deploy 4 distributed edge nodes across campus facilities. Validate sub-250ms actuation SLA, test air-gapped mesh autonomy, and compile docket.", "140 Hours", "Tranche 5 (₹1,970)"]
    ]

    for r_idx, row_content in enumerate(timeline_rows):
        for c_idx, cell_value in enumerate(row_content):
            cell = tbl_t.cell(r_idx, c_idx)
            cell.text = cell_value
            p = cell.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER if c_idx in (0, 1, 3) else PP_ALIGN.LEFT
            p.font.name = 'Times New Roman'
            if r_idx == 0:
                p.font.size = Pt(11)
                p.font.bold = True
                p.font.color.rgb = WHITE
                cell.fill.solid()
                cell.fill.fore_color.rgb = NAVY_PRIMARY
            else:
                p.font.size = Pt(9.5)
                p.font.color.rgb = DARK_CHARCOAL
                if c_idx == 0:
                    p.font.bold = True
                    p.font.color.rgb = NAVY_PRIMARY
                if r_idx % 2 == 1:
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = LIGHT_BG

    # ==========================================
    # SLIDE 10: Thank You
    # ==========================================
    s10 = prs.slides[9]
    # Center shape
    t10 = s10.shapes[0]
    format_title(t10, "Thank You", font_size=36)
    p10 = t10.text_frame.paragraphs[0]
    p10.alignment = PP_ALIGN.CENTER

    c10 = s10.shapes[1]
    tf10 = c10.text_frame
    tf10.clear()

    p_sum = tf10.paragraphs[0]
    p_sum.text = "VIGINT: Making Campus Infrastructure Autonomously Safe & Resilient"
    p_sum.font.name = 'Times New Roman'
    p_sum.font.size = Pt(16)
    p_sum.font.bold = True
    p_sum.font.color.rgb = BLUE_ACCENT
    p_sum.alignment = PP_ALIGN.CENTER
    p_sum.space_after = Pt(12)

    add_bullet(tf10, "• Core Value: ", "Sub-250ms incident detection, zero false alarms (<1.8%), and instant physical mitigation at <1/20th commercial cost.", font_size=13, space_after=6)
    add_bullet(tf10, "• Feasibility: ", "100% executable within 1 year using standard Indian electronics components with structured 6-milestone delivery.", font_size=13, space_after=6)
    add_bullet(tf10, "• Project Lead: ", "Hitansh Parikh (Lead AI & Embedded Systems Architect) | Email: hitansh.parikh@domain.edu.in", font_size=13, space_after=6)
    add_bullet(tf10, "• Faculty Mentor: ", "Dr. S. K. Sharma (Professor / Head of Department) | Department of Computer Science & Engineering", font_size=13, space_after=12)

    p_qa = tf10.add_paragraph()
    p_qa.text = "Open for Questions & Technical Discussion"
    p_qa.font.name = 'Times New Roman'
    p_qa.font.size = Pt(14)
    p_qa.font.bold = True
    p_qa.font.color.rgb = NAVY_PRIMARY
    p_qa.alignment = PP_ALIGN.CENTER

    # Save presentation
    out_file = 'iCreate_Pitch_Deck_VIGINT.pptx'
    prs.save(out_file)
    print(f"Successfully generated: {out_file}")

    # Also try copying over the sample if not locked
    try:
        prs.save('iCreate_Pitch_Deck_Sample.pptx')
        print("Successfully updated iCreate_Pitch_Deck_Sample.pptx")
    except Exception as e:
        print(f"Could not overwrite iCreate_Pitch_Deck_Sample.pptx directly (file may be open in PowerPoint): {e}")

if __name__ == "__main__":
    build_presentation()
