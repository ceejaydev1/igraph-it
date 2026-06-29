// components/maxgraph-custom-shapes.ts
// Registers custom shapes with maxGraph so the canvas matches the panel previews.

import {
  Shape,
  AbstractCanvas2D,
  ShapeRegistry,
} from '@maxgraph/core';

// ════════════════════════════════════════════════════════════════════════════
// FDD SHAPES - Canvas implementations
// ════════════════════════════════════════════════════════════════════════════

// ─── 1. FUNCTION SHAPE ─────────────────────────────────────────────────────
// Rounded Rectangle with #DCEAF7 fill, #4A78A8 border

class FDD_FunctionShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.08;
    c.setFillColor('#DCEAF7');
    c.setStrokeColor('#4A78A8');
    c.setStrokeWidth(2);
    c.roundrect(x + 1, y + 1, w - 2, h - 2, r, r);
    c.fillAndStroke();
  }
}

// ─── 2. INPUT SHAPE ──────────────────────────────────────────────────────
// Rounded Rectangle #DCEFD2 / #5A9E4B with right arrow

class FDD_InputShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.08;
    const cy = y + h / 2;
    
    // Main rectangle
    c.setFillColor('#DCEFD2');
    c.setStrokeColor('#5A9E4B');
    c.setStrokeWidth(2);
    c.roundrect(x + 1, y + 1, w - 2, h - 2, r, r);
    c.fillAndStroke();
    
    // Right arrow indicator
    c.setFillColor('#5A9E4B');
    c.setStrokeColor('#5A9E4B');
    c.begin();
    c.moveTo(x + w - 6, cy);
    c.lineTo(x + w - 14, cy - 5);
    c.lineTo(x + w - 14, cy + 5);
    c.close();
    c.fillAndStroke();
  }
}

// ─── 3. OUTPUT SHAPE ─────────────────────────────────────────────────────
// Rounded Rectangle #FBE8B8 / #F39C12 with left arrow

class FDD_OutputShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.08;
    const cy = y + h / 2;
    
    // Main rectangle
    c.setFillColor('#FBE8B8');
    c.setStrokeColor('#F39C12');
    c.setStrokeWidth(2);
    c.roundrect(x + 1, y + 1, w - 2, h - 2, r, r);
    c.fillAndStroke();
    
    // Left arrow indicator
    c.setFillColor('#F39C12');
    c.setStrokeColor('#F39C12');
    c.begin();
    c.moveTo(x + 6, cy);
    c.lineTo(x + 14, cy - 5);
    c.lineTo(x + 14, cy + 5);
    c.close();
    c.fillAndStroke();
  }
}

// ─── 4. CONTROL CONNECTOR ──────────────────────────────────────────────
// Solid arrow Left → Right

class FDD_ControlShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#000000');
    c.setStrokeWidth(2);
    c.setFillColor('#000000');
    
    // Line
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 12, cy);
    c.stroke();
    
    // Arrow head
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - 12, cy - 6);
    c.lineTo(x + w - 12, cy + 6);
    c.close();
    c.fillAndStroke();
  }
}

// ─── 5. MECHANISM (ENABLER) CONNECTOR ──────────────────────────────────
// Dashed arrow (8 4) Left → Right

class FDD_MechanismShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#000000');
    c.setStrokeWidth(2);
    c.setFillColor('#000000');
    
    // Dashed line
    c.setDashed(true);
    c.setDashPattern('8 4');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 12, cy);
    c.stroke();
    c.setDashed(false);
    
    // Arrow head
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - 12, cy - 6);
    c.lineTo(x + w - 12, cy + 6);
    c.close();
    c.fillAndStroke();
  }
}

// ─── 6. INTERFACE CONNECTOR ─────────────────────────────────────────────
// Double-ended arrow

class FDD_InterfaceShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrowSize = 6;
    const arrowWidth = 12;
    
    c.setStrokeColor('#000000');
    c.setStrokeWidth(2);
    c.setFillColor('#000000');
    
    // Left arrow head (pointing left)
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + arrowWidth, cy - arrowSize);
    c.lineTo(x + arrowWidth, cy + arrowSize);
    c.close();
    c.fillAndStroke();
    
    // Right arrow head (pointing right)
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrowWidth, cy - arrowSize);
    c.lineTo(x + w - arrowWidth, cy + arrowSize);
    c.close();
    c.fillAndStroke();
    
    // Connecting line
    c.begin();
    c.moveTo(x + arrowWidth, cy);
    c.lineTo(x + w - arrowWidth, cy);
    c.stroke();
  }
}

// ─── 7. BOUNDARY SHAPE ──────────────────────────────────────────────────
// Dashed rounded rectangle

class FDD_BoundaryShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.06;
    c.setFillColor('transparent');
    c.setStrokeColor('#666666');
    c.setStrokeWidth(2);
    c.setDashed(true);
    c.setDashPattern('8 4');
    c.roundrect(x + 1, y + 1, w - 2, h - 2, r, r);
    c.stroke();
    c.setDashed(false);
  }
}

// ─── 8. NOTE / COMMENT SHAPE ────────────────────────────────────────────
// Document with folded corner

class FDD_NoteShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const fold = Math.min(w, h) * 0.18;
    c.setFillColor('#FFF4CC');
    c.setStrokeColor('#B7950B');
    c.setStrokeWidth(2);
    
    // Main body with folded corner
    c.begin();
    c.moveTo(x + 1, y + 1);
    c.lineTo(x + w - fold - 1, y + 1);
    c.lineTo(x + w - 1, y + fold + 1);
    c.lineTo(x + w - 1, y + h - 1);
    c.lineTo(x + 1, y + h - 1);
    c.close();
    c.fillAndStroke();
    
    // Fold line - vertical
    c.begin();
    c.moveTo(x + w - fold - 1, y + 1);
    c.lineTo(x + w - fold - 1, y + fold + 1);
    c.stroke();
    
    // Fold line - horizontal
    c.begin();
    c.moveTo(x + w - fold - 1, y + fold + 1);
    c.lineTo(x + w - 1, y + fold + 1);
    c.stroke();
  }
}

// ─── 9. EXTERNAL ENTITY SHAPE ───────────────────────────────────────────
// Ellipse

class FDD_ExternalEntityShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#F4F4F4');
    c.setStrokeColor('#8E8E8E');
    c.setStrokeWidth(2);
    c.ellipse(x + 1, y + 1, w - 2, h - 2);
    c.fillAndStroke();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BASIC SHAPES - Canvas implementations
// ════════════════════════════════════════════════════════════════════════════

class RectangleShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class RoundedRectShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.15;
    c.roundrect(x + 2, y + 2, w - 4, h - 4, r, r);
    c.fillAndStroke();
  }
}

class CircleShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2 - 4;
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.fillAndStroke();
  }
}

class EllipseShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.ellipse(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class DiamondShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(x + w - 2, cy);
    c.lineTo(cx, y + h - 2);
    c.lineTo(x + 2, cy);
    c.close();
    c.fillAndStroke();
  }
}

class TriangleShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(x + w - 2, y + h - 2);
    c.lineTo(x + 2, y + h - 2);
    c.close();
    c.fillAndStroke();
  }
}

class ParallelogramShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const offset = w * 0.18;
    c.begin();
    c.moveTo(x + offset, y + 2);
    c.lineTo(x + w - 2, y + 2);
    c.lineTo(x + w - offset, y + h - 2);
    c.lineTo(x + 2, y + h - 2);
    c.close();
    c.fillAndStroke();
  }
}

class CylinderShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const rx = (w - 4) / 2, ry = 6, cx = x + w / 2;
    c.begin();
    c.moveTo(x + 2, y + ry + 2);
    c.lineTo(x + 2, y + h - ry - 2);
    c.arcTo(rx, ry, 0, false, false, x + w - 2, y + h - ry - 2);
    c.lineTo(x + w - 2, y + ry + 2);
    c.fillAndStroke();
    c.ellipse(x + 2, y + 2, w - 4, ry * 2);
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + 2, y + h - ry - 2);
    c.arcTo(rx, ry, 0, false, false, x + w - 2, y + h - ry - 2);
    c.stroke();
  }
}

// ─── Document Shape ─────────────────────────────────────────────────────────
class DocumentShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x, y);
    c.lineTo(x + w, y);
    c.lineTo(x + w, y + h * 0.8);
    
    c.curveTo(
      x + w * 0.75, y + h * 0.7,
      x + w * 0.6, y + h * 0.9,
      x + w * 0.5, y + h * 0.8
    );
    
    c.curveTo(
      x + w * 0.4, y + h * 0.7,
      x + w * 0.2, y + h * 0.9,
      x, y + h * 0.8
    );
    
    c.close();
    c.fillAndStroke();
    
    // Inner text lines
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(1);
    c.setAlpha(0.3);
    c.begin();
    c.moveTo(x + 10, y + 12);
    c.lineTo(x + w - 10, y + 12);
    c.stroke();
    c.begin();
    c.moveTo(x + 10, y + 20);
    c.lineTo(x + w - 10, y + 20);
    c.stroke();
    c.setAlpha(1);
  }
}

class FolderShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const tabWidth = w * 0.25;
    const tabHeight = h * 0.2;
    c.begin();
    c.moveTo(x + 2, y + tabHeight + 2);
    c.lineTo(x + tabWidth + 2, y + tabHeight + 2);
    c.lineTo(x + tabWidth + 6, y + 2);
    c.lineTo(x + w - 2, y + 2);
    c.lineTo(x + w - 2, y + h - 2);
    c.lineTo(x + 2, y + h - 2);
    c.close();
    c.fillAndStroke();
  }
}

class CloudShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    const r = Math.min(w, h) * 0.4;
    c.begin();
    c.moveTo(cx - r * 0.6, y + h - 6);
    c.arcTo(r * 0.9, r * 0.5, 0, false, true, cx - r, y + h - 16);
    c.arcTo(r * 0.8, r * 0.4, 0, false, true, cx - r * 0.5, y + h - 27);
    c.arcTo(r * 0.6, r * 0.3, 0, false, true, cx, y + h - 34);
    c.arcTo(r * 0.6, r * 0.3, 0, false, true, cx + r * 0.4, y + h - 27);
    c.arcTo(r * 0.7, r * 0.4, 0, false, true, cx + r, y + h - 16);
    c.arcTo(r * 0.8, r * 0.4, 0, false, true, cx + r * 0.5, y + h - 6);
    c.close();
    c.fillAndStroke();
  }
}

class NoteStandaloneShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const fold = Math.min(w, h) * 0.2;
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + w - fold - 2, y + 2);
    c.lineTo(x + w - 2, y + fold + 2);
    c.lineTo(x + w - 2, y + h - 2);
    c.lineTo(x + 2, y + h - 2);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + w - fold - 2, y + 2);
    c.lineTo(x + w - fold - 2, y + fold + 2);
    c.lineTo(x + w - 2, y + fold + 2);
    c.stroke();
  }
}

class ActorShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const headR = Math.min(w, h) * 0.12;
    const headCY = y + headR + 4;
    c.ellipse(cx - headR, headCY - headR, headR * 2, headR * 2);
    c.fillAndStroke();
    const bodyTop = headCY + headR;
    const bodyBot = y + h * 0.72;
    c.begin(); c.moveTo(cx, bodyTop); c.lineTo(cx, bodyBot); c.stroke();
    c.begin(); c.moveTo(x + w * 0.2, bodyTop + (bodyBot - bodyTop) * 0.3);
    c.lineTo(x + w * 0.8, bodyTop + (bodyBot - bodyTop) * 0.3); c.stroke();
    c.begin(); c.moveTo(cx, bodyBot); c.lineTo(x + w * 0.2, y + h - 4); c.stroke();
    c.begin(); c.moveTo(cx, bodyBot); c.lineTo(x + w * 0.8, y + h - 4); c.stroke();
  }
}

class ConnectorArrowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 10, cy); c.stroke();
    c.begin();
    c.moveTo(x + w - 10, cy - 5);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 5);
    c.close();
    c.fill();
  }
}

class DoubleRectShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.rect(x + 6, y + 6, w - 12, h - 12);
    c.stroke();
  }
}

class DoubleRhombusShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    const drawDiamond = (pad: number) => {
      c.begin();
      c.moveTo(cx, y + pad);
      c.lineTo(x + w - pad, cy);
      c.lineTo(cx, y + h - pad);
      c.lineTo(x + pad, cy);
      c.close();
    };
    drawDiamond(2); c.fillAndStroke();
    drawDiamond(6); c.stroke();
  }
}

class MultiOvalShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.ellipse(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.ellipse(x + 6, y + 6, w - 12, h - 12);
    c.stroke();
  }
}

class LineShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class TextShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setDashed(true);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
    c.setDashed(false);
  }
}

class DashedRectShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setDashed(true);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.setDashed(false);
  }
}

class PredefinedShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    const m = 8;
    c.begin(); c.moveTo(x + m, y + 2); c.lineTo(x + m, y + h - 2); c.stroke();
    c.begin(); c.moveTo(x + w - m, y + 2); c.lineTo(x + w - m, y + h - 2); c.stroke();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FLOWCHART SHAPES - Canvas implementations (EXACT COORDINATE MATCH)
// ════════════════════════════════════════════════════════════════════════════

// ─── Off-Page Connector (Pentagon pointing down) ──────────────────────────
class PentagonShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x, y);
    c.lineTo(x + w, y);
    c.lineTo(x + w, y + h * 0.68);
    c.lineTo(x + w / 2, y + h);
    c.lineTo(x, y + h * 0.68);
    c.close();
    c.fillAndStroke();
  }
}

// ─── Manual Input (Trapezoid) ──────────────────────────────────────────────
class TrapezoidShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x, y + h * 0.25);
    c.lineTo(x + w, y);
    c.lineTo(x + w, y + h);
    c.lineTo(x, y + h);
    c.close();
    c.fillAndStroke();
  }
}

// ─── D-Shape (Delay - flat left, rounded right) ────────────────────────────
class DShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x, y);
    c.lineTo(x + w * 0.7, y);
    c.quadTo(
      x + w,
      y + h * 0.5,
      x + w * 0.7,
      y + h
    );
    c.lineTo(x, y + h);
    c.close();
    c.fillAndStroke();
  }
}

// ─── Display Symbol (curved sides) ─────────────────────────────────────────
class DisplayShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + w * 0.15, y);
    c.lineTo(x + w * 0.85, y);
    c.quadTo(
      x + w,
      y,
      x + w,
      y + h * 0.25
    );
    c.lineTo(x + w, y + h * 0.75);
    c.quadTo(
      x + w,
      y + h,
      x + w * 0.85,
      y + h
    );
    c.lineTo(x + w * 0.15, y + h);
    c.quadTo(
      x,
      y + h * 0.5,
      x + w * 0.15,
      y
    );
    c.close();
    c.fillAndStroke();
  }
}

// ─── Hexagon (Preparation) ──────────────────────────────────────────────────
class HexagonShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const hw = w / 2;
    const hh = h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(cx - hw, cy);
    c.lineTo(cx - hw * 0.5, cy - hh);
    c.lineTo(cx + hw * 0.5, cy - hh);
    c.lineTo(cx + hw, cy);
    c.lineTo(cx + hw * 0.5, cy + hh);
    c.lineTo(cx - hw * 0.5, cy + hh);
    c.close();
    c.fillAndStroke();
  }
}

// ─── Annotation (open bracket with dashed connector) ──────────────────────
class AnnotationShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 4, y + 4);
    c.lineTo(x + 10, y + 4);
    c.lineTo(x + 10, y + h - 4);
    c.lineTo(x + 4, y + h - 4);
    c.stroke();
    c.setDashed(true);
    c.setDashPattern('4 4');
    c.begin();
    c.moveTo(x + 10, cy);
    c.lineTo(x + w - 4, cy);
    c.stroke();
    c.setDashed(false);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// UML SHAPES
// ════════════════════════════════════════════════════════════════════════════

class InitialNodeSolid extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) / 2 - 4;
    const cx = x + w / 2, cy = y + h / 2;
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.fill();
  }
}

class FinalNodeShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) / 2 - 2;
    const cx = x + w / 2, cy = y + h / 2;
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.fillAndStroke();
    const r2 = r * 0.55;
    c.ellipse(cx - r2, cy - r2, r2 * 2, r2 * 2);
    c.fill();
  }
}

class ForkJoinShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + h / 2 - 6, w - 4, 12);
    c.fill();
    c.stroke();
  }
}

class LifelineShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const boxH = h * 0.25;
    c.rect(x + w * 0.1, y + 2, w * 0.8, boxH);
    c.fillAndStroke();
    c.setDashed(true);
    c.begin();
    c.moveTo(x + w / 2, y + boxH + 2);
    c.lineTo(x + w / 2, y + h - 2);
    c.stroke();
    c.setDashed(false);
  }
}

class ActivationShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    c.setDashed(true);
    c.begin(); c.moveTo(cx, y + 2); c.lineTo(cx, y + h - 2); c.stroke();
    c.setDashed(false);
    const bw = 10, bh = h * 0.5;
    c.rect(cx - bw / 2, y + h * 0.25, bw, bh);
    c.fillAndStroke();
  }
}

class ClassBoxShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    const h1 = h * 0.3, h2 = h * 0.6;
    c.begin(); c.moveTo(x + 2, y + h1 + 2); c.lineTo(x + w - 2, y + h1 + 2); c.stroke();
    c.begin(); c.moveTo(x + 2, y + h2 + 2); c.lineTo(x + w - 2, y + h2 + 2); c.stroke();
  }
}

class UMLInterfaceShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.setDashed(true);
    c.rect(x + 6, y + 6, w - 12, h - 12);
    c.stroke();
    c.setDashed(false);
  }
}

class AbstractClassShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    const h1 = h * 0.3, h2 = h * 0.6;
    c.begin(); c.moveTo(x + 2, y + h1 + 2); c.lineTo(x + w - 2, y + h1 + 2); c.stroke();
    c.begin(); c.moveTo(x + 2, y + h2 + 2); c.lineTo(x + w - 2, y + h2 + 2); c.stroke();
    c.setDashed(true);
    c.begin(); c.moveTo(x + w * 0.25, y + h1 * 0.5 + 4); c.lineTo(x + w * 0.75, y + h1 * 0.5 + 4); c.stroke();
    c.setDashed(false);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ERD SHAPES
// ════════════════════════════════════════════════════════════════════════════

class EntityShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class WeakEntityShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.rect(x + 6, y + 6, w - 12, h - 12);
    c.stroke();
  }
}

class AttributeShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.ellipse(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class PrimaryKeyShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.ellipse(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + w * 0.2, y + h - 5);
    c.lineTo(x + w * 0.8, y + h - 5);
    c.stroke();
  }
}

class DerivedAttrShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setDashed(true);
    c.ellipse(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.setDashed(false);
  }
}

class CompositeAttrShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.ellipse(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    const childR = Math.min(w, h) * 0.2;
    c.ellipse(x + w * 0.7, y + h * 0.7, childR, childR * 0.7);
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + w * 0.5, y + h * 0.5);
    c.lineTo(x + w * 0.65, y + h * 0.65);
    c.stroke();
  }
}

class MultiAttrShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.ellipse(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.ellipse(x + 6, y + 6, w - 12, h - 12);
    c.stroke();
  }
}

class RelationshipShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(x + w - 2, cy);
    c.lineTo(cx, y + h - 2);
    c.lineTo(x + 2, cy);
    c.close();
    c.fillAndStroke();
  }
}

class IdentifyingRelShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    const diamond = (pad: number) => {
      c.begin();
      c.moveTo(cx, y + pad);
      c.lineTo(x + w - pad, cy);
      c.lineTo(cx, y + h - pad);
      c.lineTo(x + pad, cy);
      c.close();
    };
    diamond(2); c.fillAndStroke();
    diamond(6); c.stroke();
  }
}

class CardinalityShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
  }
}

class CrowOneShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + w - 2, y + 4); c.lineTo(x + w - 2, y + h - 4); c.stroke();
  }
}

class CrowZeroOneShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.22;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - r * 2 - 4, cy); c.stroke();
    c.ellipse(x + w - r * 2 - 4, cy - r, r * 2, r * 2); c.stroke();
    c.begin(); c.moveTo(x + w - r * 2 - 4, cy - r); c.lineTo(x + w - r * 2 - 4, cy + r); c.stroke();
  }
}

class CrowZeroManyShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.18;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.ellipse(x + w - r * 2 - 2, cy - r, r * 2, r * 2); c.stroke();
    c.begin(); c.moveTo(x + w - 2, cy - r * 1.8); c.lineTo(x + w - 2, cy + r * 1.8); c.stroke();
    c.begin(); c.moveTo(x + w - r - 2, cy - r * 1.4); c.lineTo(x + w - 2, cy); c.lineTo(x + w - r - 2, cy + r * 1.4); c.stroke();
  }
}

class CrowOneManyShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + w - 2, cy - r * 1.5); c.lineTo(x + w - 2, cy + r * 1.5); c.stroke();
    c.begin(); c.moveTo(x + w - r - 2, cy - r * 1.2); c.lineTo(x + w - 2, cy); c.lineTo(x + w - r - 2, cy + r * 1.2); c.stroke();
  }
}

class CrowManyShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.22;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + w - r - 2, cy - r * 1.4); c.lineTo(x + w - 2, cy); c.lineTo(x + w - r - 2, cy + r * 1.4); c.stroke();
  }
}

class TotalParticipationShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + 6, y + 4); c.lineTo(x + 6, y + h - 4); c.stroke();
    c.begin(); c.moveTo(x + 11, y + 4); c.lineTo(x + 11, y + h - 4); c.stroke();
  }
}

class PartialParticipationShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + 6, y + 4); c.lineTo(x + 6, y + h - 4); c.stroke();
  }
}

class ERDConnectorShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ARROW SHAPES
// ════════════════════════════════════════════════════════════════════════════

class ArrowShapeX extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 10, cy); c.stroke();
    c.begin();
    c.moveTo(x + w - 10, cy - 5);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 5);
    c.close();
    c.fill();
  }
}

class ArrowDownShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    c.begin(); c.moveTo(cx, y + 2); c.lineTo(cx, y + h - 10); c.stroke();
    c.begin();
    c.moveTo(cx - 5, y + h - 10);
    c.lineTo(cx, y + h - 2);
    c.lineTo(cx + 5, y + h - 10);
    c.close();
    c.fill();
  }
}

class ArrowRightShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 10, cy); c.stroke();
    c.begin();
    c.moveTo(x + w - 10, cy - 6);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 6);
    c.close();
    c.fill();
  }
}

class OpenArrowShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 10, cy); c.stroke();
    c.begin();
    c.moveTo(x + w - 10, cy - 6);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 6);
    c.close();
    c.stroke();
  }
}

class DashedArrowShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setDashed(true);
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 10, cy); c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + w - 10, cy - 5);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 5);
    c.close();
    c.fill();
  }
}

class DashedArrowBackShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setDashed(true);
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + 12, cy - 5);
    c.lineTo(x + 2, cy);
    c.lineTo(x + 12, cy + 5);
    c.close();
    c.fill();
  }
}

class TriangleArrowShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 12, cy); c.stroke();
    c.begin();
    c.moveTo(x + w - 12, cy - 8);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 12, cy + 8);
    c.close();
    c.stroke();
  }
}

class LoopArrowShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    c.begin();
    c.moveTo(cx - 4, cy + 4);
    c.arcTo(w * 0.35, h * 0.4, 0, false, true, cx - 4, cy - 4);
    c.arcTo(w * 0.35, h * 0.4, 0, false, true, cx + 4, cy + 4);
    c.stroke();
    c.begin();
    c.moveTo(cx + 4, cy + 4);
    c.lineTo(cx - 2, cy + 10);
    c.lineTo(cx - 2, cy - 2);
    c.close();
    c.fill();
  }
}

class CreateArrowShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 10, cy); c.stroke();
    c.begin();
    c.moveTo(x + w - 10, cy - 5);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 5);
    c.close();
    c.fill();
  }
}

class DestructionShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    const s = Math.min(w, h) * 0.3;
    c.begin(); c.moveTo(cx - s, cy - s); c.lineTo(cx + s, cy + s); c.stroke();
    c.begin(); c.moveTo(cx + s, cy - s); c.lineTo(cx - s, cy + s); c.stroke();
  }
}

class AggregationShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + 12, cy - 7);
    c.lineTo(x + 22, cy);
    c.lineTo(x + 12, cy + 7);
    c.close();
    c.fillAndStroke();
    c.begin(); c.moveTo(x + 22, cy); c.lineTo(x + w - 2, cy); c.stroke();
  }
}

class CompositionShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + 12, cy - 7);
    c.lineTo(x + 22, cy);
    c.lineTo(x + 12, cy + 7);
    c.close();
    c.fill();
    c.begin(); c.moveTo(x + 22, cy); c.lineTo(x + w - 2, cy); c.stroke();
  }
}

class MultiplicityShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 2, y + h / 2 - 6, w - 4, 12);
    c.stroke();
  }
}

class ArrowDiagShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.begin();
    c.moveTo(x + 2, y + h - 2);
    c.lineTo(x + w - 2, y + 2);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 2, y + 2);
    c.lineTo(x + w - 10, y + 2);
    c.lineTo(x + w - 2, y + 10);
    c.close();
    c.fill();
  }
}

class ArrowSmallShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 8, cy); c.stroke();
    c.begin();
    c.moveTo(x + w - 8, cy - 4);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 8, cy + 4);
    c.close();
    c.fill();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SCHEMATIC SHAPES
// ════════════════════════════════════════════════════════════════════════════

class ResistorShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const segs = 6;
    const segW = (w - 8) / segs;
    c.begin();
    c.moveTo(x + 2, cy);
    for (let i = 0; i < segs; i++) {
      const px = x + 2 + i * segW;
      c.lineTo(px, i % 2 === 0 ? cy - h * 0.3 : cy + h * 0.3);
    }
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class CapacitorShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w / 2 - 5, cy); c.stroke();
    c.begin(); c.moveTo(x + w / 2 - 1, y + 3); c.lineTo(x + w / 2 - 1, y + h - 3); c.stroke();
    c.begin(); c.moveTo(x + w / 2 + 3, y + 5); c.lineTo(x + w / 2 + 3, y + h - 5); c.stroke();
    c.begin(); c.moveTo(x + w / 2 + 7, cy); c.lineTo(x + w - 2, cy); c.stroke();
  }
}

class InductorShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const loops = 5;
    const loopW = (w - 8) / loops;
    c.begin();
    c.moveTo(x + 2, cy);
    for (let i = 0; i < loops; i++) {
      const lx = x + 2 + i * loopW;
      c.arcTo(loopW / 2, h / 3, 0, false, true, lx + loopW, cy);
    }
    c.stroke();
  }
}

class VoltageShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    const r = Math.min(w, h) * 0.38;
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.fillAndStroke();
    c.begin(); c.moveTo(cx - r * 0.3, cy - r * 0.5); c.lineTo(cx + r * 0.3, cy - r * 0.5); c.stroke();
    c.begin(); c.moveTo(cx, cy - r * 0.8); c.lineTo(cx, cy - r * 0.2); c.stroke();
    c.begin(); c.moveTo(cx - r * 0.3, cy + r * 0.4); c.lineTo(cx + r * 0.3, cy + r * 0.4); c.stroke();
  }
}

class GroundShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    c.begin(); c.moveTo(cx, y + 2); c.lineTo(cx, y + h * 0.45); c.stroke();
    const lines = [0.7, 0.5, 0.3];
    const ys = [h * 0.5, h * 0.65, h * 0.8];
    lines.forEach((pct, i) => {
      const hw = w * pct * 0.5;
      c.begin(); c.moveTo(cx - hw, y + ys[i]); c.lineTo(cx + hw, y + ys[i]); c.stroke();
    });
  }
}

class DiodeShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w * 0.35, cy); c.stroke();
    c.begin();
    c.moveTo(x + w * 0.35, cy - h * 0.35);
    c.lineTo(x + w * 0.65, cy);
    c.lineTo(x + w * 0.35, cy + h * 0.35);
    c.close();
    c.fillAndStroke();
    c.begin(); c.moveTo(x + w * 0.65, cy - h * 0.35); c.lineTo(x + w * 0.65, cy + h * 0.35); c.stroke();
    c.begin(); c.moveTo(x + w * 0.65, cy); c.lineTo(x + w - 2, cy); c.stroke();
  }
}

class TransistorShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    const r = Math.min(w, h) * 0.32;
    c.ellipse(cx - r, cy - r, r * 2, r * 2); c.fillAndStroke();
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(cx - r, cy); c.stroke();
    c.begin(); c.moveTo(cx, cy - r); c.lineTo(cx, y + 2); c.stroke();
    c.begin(); c.moveTo(cx, cy + r); c.lineTo(cx, y + h - 4); c.stroke();
    c.begin();
    c.moveTo(cx - 4, y + h - 10);
    c.lineTo(cx, y + h - 4);
    c.lineTo(cx + 4, y + h - 10);
    c.close();
    c.fill();
  }
}

class ICShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.rect(x + 8, y + 4, w - 16, h - 8);
    c.fillAndStroke();
    const pinCount = 4;
    const spacing = (h - 8) / (pinCount + 1);
    for (let i = 0; i < pinCount; i++) {
      const py = y + 4 + (i + 1) * spacing;
      c.begin(); c.moveTo(x + 2, py); c.lineTo(x + 8, py); c.stroke();
      c.begin(); c.moveTo(x + w - 8, py); c.lineTo(x + w - 2, py); c.stroke();
    }
  }
}

class OpAmpShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + 2, y + h - 2);
    c.close();
    c.fillAndStroke();
    c.begin(); c.moveTo(x + 2, cy - h * 0.2); c.lineTo(x + w * 0.25, cy - h * 0.2); c.stroke();
    c.begin(); c.moveTo(x + 2, cy + h * 0.2); c.lineTo(x + w * 0.25, cy + h * 0.2); c.stroke();
  }
}

class SwitchShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const cx = x + w / 2;
    const r = Math.min(w, h) * 0.18;
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(cx - r, cy); c.stroke();
    c.begin(); c.moveTo(cx + r, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.ellipse(cx - r, cy - r, r * 2, r * 2); c.stroke();
    c.begin(); c.moveTo(cx, cy); c.lineTo(cx + r * 0.7, cy - r * 0.9); c.stroke();
  }
}

class FuseShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.rect(x + w * 0.2, cy - h * 0.28, w * 0.6, h * 0.56);
    c.fillAndStroke();
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w * 0.2, cy); c.stroke();
    c.begin(); c.moveTo(x + w * 0.8, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + w * 0.35, cy); c.lineTo(x + w * 0.65, cy); c.stroke();
  }
}

class TransformerShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const coils = 3;
    const halfW = w / 2 - 4;
    const loopW = halfW / coils;
    c.begin(); c.moveTo(x + 2, cy);
    for (let i = 0; i < coils; i++) {
      const lx = x + 2 + i * loopW;
      c.arcTo(loopW / 2, h * 0.25, 0, false, true, lx + loopW, cy);
    }
    c.stroke();
    c.begin(); c.moveTo(x + w / 2 + 4, cy);
    for (let i = 0; i < coils; i++) {
      const lx = x + w / 2 + 4 + i * loopW;
      c.arcTo(loopW / 2, h * 0.25, 0, false, false, lx + loopW, cy);
    }
    c.stroke();
    c.setDashed(true);
    c.begin(); c.moveTo(x + w / 2, y + 4); c.lineTo(x + w / 2, y + h - 4); c.stroke();
    c.setDashed(false);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTRATION TABLE
// ════════════════════════════════════════════════════════════════════════════

const SHAPE_REGISTRY: Record<string, typeof Shape> = {
  // ─── FDD Shapes ──────────────────────────────────────────────────────────
  'igraph.fdd.function': FDD_FunctionShapeCanvas,
  'igraph.fdd.input': FDD_InputShapeCanvas,
  'igraph.fdd.output': FDD_OutputShapeCanvas,
  'igraph.fdd.control': FDD_ControlShapeCanvas,
  'igraph.fdd.mechanism': FDD_MechanismShapeCanvas,
  'igraph.fdd.interface': FDD_InterfaceShapeCanvas,
  'igraph.fdd.boundary': FDD_BoundaryShapeCanvas,
  'igraph.fdd.note': FDD_NoteShapeCanvas,
  'igraph.fdd.externalEntity': FDD_ExternalEntityShapeCanvas,

  // ─── Standard Shapes ────────────────────────────────────────────────────
  'igraph.rectangle': RectangleShapeCanvas,
  'igraph.roundedRectangle': RoundedRectShapeCanvas,
  'igraph.circle': CircleShapeCanvas,
  'igraph.ellipse': EllipseShapeCanvas,
  'igraph.diamond': DiamondShapeCanvas,
  'igraph.triangle': TriangleShapeCanvas,
  'igraph.parallelogram': ParallelogramShapeCanvas,
  'igraph.cylinder': CylinderShapeCanvas,
  'igraph.document': DocumentShapeCanvas,
  'igraph.folder': FolderShapeCanvas,
  'igraph.cloud': CloudShapeCanvas,
  'igraph.noteStandalone': NoteStandaloneShapeCanvas,
  'igraph.actor': ActorShapeCanvas,
  'igraph.connectorArrow': ConnectorArrowShapeCanvas,
  'igraph.doubleRectangle': DoubleRectShapeCanvas,
  'igraph.doubleRhombus': DoubleRhombusShapeCanvas,
  'igraph.multiOval': MultiOvalShapeCanvas,
  'igraph.line': LineShapeCanvas,
  'igraph.text': TextShapeCanvas,
  'igraph.dashedRect': DashedRectShapeCanvas,
  'igraph.predefined': PredefinedShapeCanvas,

  // ─── Flowchart Shapes ──────────────────────────────────────────────────
  'igraph.pentagon': PentagonShapeCanvas,
  'igraph.trapezoid': TrapezoidShapeCanvas,
  'igraph.dshape': DShapeCanvas,
  'igraph.hexagon': HexagonShapeCanvas,
  'igraph.display': DisplayShapeCanvas,
  'igraph.annotation': AnnotationShapeCanvas,

  // ─── UML Shapes ──────────────────────────────────────────────────────────
  'igraph.initialNode': InitialNodeSolid,
  'igraph.finalNode': FinalNodeShape,
  'igraph.forkJoin': ForkJoinShape,
  'igraph.lifeline': LifelineShape,
  'igraph.activation': ActivationShape,
  'igraph.classBox': ClassBoxShape,
  'igraph.interface': UMLInterfaceShapeCanvas,
  'igraph.abstractClass': AbstractClassShape,

  // ─── ERD Shapes ──────────────────────────────────────────────────────────
  'igraph.entity': EntityShape,
  'igraph.weakEntity': WeakEntityShape,
  'igraph.attribute': AttributeShape,
  'igraph.primaryKey': PrimaryKeyShape,
  'igraph.derivedAttr': DerivedAttrShape,
  'igraph.compositeAttr': CompositeAttrShape,
  'igraph.multiAttr': MultiAttrShape,
  'igraph.relationship': RelationshipShape,
  'igraph.identifyingRel': IdentifyingRelShape,
  'igraph.cardinality': CardinalityShape,
  'igraph.crowOne': CrowOneShape,
  'igraph.crowZeroOne': CrowZeroOneShape,
  'igraph.crowZeroMany': CrowZeroManyShape,
  'igraph.crowOneMany': CrowOneManyShape,
  'igraph.crowMany': CrowManyShape,
  'igraph.totalParticipation': TotalParticipationShape,
  'igraph.partialParticipation': PartialParticipationShape,
  'igraph.erdConnector': ERDConnectorShape,

  // ─── Arrows ──────────────────────────────────────────────────────────────
  'igraph.arrow': ArrowShapeX,
  'igraph.arrowDown': ArrowDownShape,
  'igraph.arrowRight': ArrowRightShape,
  'igraph.filledArrow': ArrowShapeX,
  'igraph.openArrow': OpenArrowShape,
  'igraph.dashedArrow': DashedArrowShape,
  'igraph.dashedArrowBack': DashedArrowBackShape,
  'igraph.triangleArrow': TriangleArrowShape,
  'igraph.loopArrow': LoopArrowShape,
  'igraph.createArrow': CreateArrowShape,
  'igraph.destruction': DestructionShape,
  'igraph.aggregation': AggregationShape,
  'igraph.composition': CompositionShape,
  'igraph.multiplicity': MultiplicityShape,
  'igraph.arrowDiag': ArrowDiagShape,
  'igraph.arrowSmall': ArrowSmallShape,

  // ─── Schematic ──────────────────────────────────────────────────────────
  'igraph.resistor': ResistorShape,
  'igraph.capacitor': CapacitorShape,
  'igraph.inductor': InductorShape,
  'igraph.voltage': VoltageShape,
  'igraph.ground': GroundShape,
  'igraph.diode': DiodeShape,
  'igraph.transistor': TransistorShape,
  'igraph.ic': ICShape,
  'igraph.opamp': OpAmpShape,
  'igraph.switch': SwitchShape,
  'igraph.fuse': FuseShape,
  'igraph.transformer': TransformerShape,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call this ONCE at app startup (before any Graph is created).
 * Uses maxGraph's official ShapeRegistry.add(name, cls) API.
 */
export function registerAllCustomShapes(): void {
  Object.entries(SHAPE_REGISTRY).forEach(([name, cls]) => {
    ShapeRegistry.add(name, cls);
  });
  console.log('✅ Registered', Object.keys(SHAPE_REGISTRY).length, 'custom igraph shapes');
}

// ─── ID to Style Map ─────────────────────────────────────────────────────────

export const IGRAPH_ID_STYLE_MAP: Record<string, string> = {
  // ─── FDD Shapes ──────────────────────────────────────────────────────────
  'function': 'igraph.fdd.function',
  'input': 'igraph.fdd.input',
  'output': 'igraph.fdd.output',
  'control': 'igraph.fdd.control',
  'mechanism': 'igraph.fdd.mechanism',
  'fdd-interface': 'igraph.fdd.interface',
  'boundary': 'igraph.fdd.boundary',
  'fdd-note': 'igraph.fdd.note',
  'external-entity': 'igraph.fdd.externalEntity',
  
  // ─── Standard ───────────────────────────────────────────────────────────
  'rectangle': 'igraph.rectangle',
  'rounded-rectangle': 'igraph.roundedRectangle',
  'circle': 'igraph.circle',
  'ellipse': 'igraph.ellipse',
  'diamond': 'igraph.diamond',
  'triangle': 'igraph.triangle',
  'parallelogram': 'igraph.parallelogram',
  'cylinder': 'igraph.cylinder',
  'document': 'igraph.document',
  'folder': 'igraph.folder',
  'cloud': 'igraph.cloud',
  'noteStandalone': 'igraph.noteStandalone',
  'std-actor': 'igraph.actor',
  'connector-arrow': 'igraph.connectorArrow',

  // ─── Flowchart ──────────────────────────────────────────────────────────
  'terminator': 'igraph.roundedRectangle',
  'process': 'igraph.rectangle',
  'decision': 'igraph.diamond',
  'io': 'igraph.parallelogram',
  'on-page-connector': 'igraph.circle',
  'off-page-connector': 'igraph.pentagon',
  'flow-line': 'igraph.connectorArrow',
  'predefined': 'igraph.predefined',
  'database': 'igraph.cylinder',
  'manual-input': 'igraph.trapezoid',
  'delay': 'igraph.dshape',
  'preparation': 'igraph.hexagon',
  'display': 'igraph.display',
  'annotation': 'igraph.annotation',

  // ─── Data Flow ──────────────────────────────────────────────────────────
  'dfd-external-entity': 'igraph.rectangle',
  'dfd-process': 'igraph.ellipse',
  'data-store': 'igraph.cylinder',
  'data-flow': 'igraph.connectorArrow',

  // ─── ERD ────────────────────────────────────────────────────────────────
  'entity': 'igraph.entity',
  'weak-entity': 'igraph.weakEntity',
  'attribute': 'igraph.attribute',
  'primary-key': 'igraph.primaryKey',
  'derived-attr': 'igraph.derivedAttr',
  'composite-attr': 'igraph.compositeAttr',
  'multi-attr': 'igraph.multiAttr',
  'relationship': 'igraph.relationship',
  'identifying-rel': 'igraph.identifyingRel',
  'cardinality': 'igraph.cardinality',
  'crow-one': 'igraph.crowOne',
  'crow-zero-one': 'igraph.crowZeroOne',
  'crow-zero-many': 'igraph.crowZeroMany',
  'crow-one-many': 'igraph.crowOneMany',
  'crow-many': 'igraph.crowMany',
  'total-participation': 'igraph.totalParticipation',
  'partial-participation': 'igraph.partialParticipation',
  'erd-connector': 'igraph.erdConnector',

  // ─── Fishbone ────────────────────────────────────────────────────────────
  'effect': 'igraph.rectangle',
  'spine': 'igraph.connectorArrow',
  'major-bone': 'igraph.arrowDiag',
  'sub-bone': 'igraph.arrowSmall',
  'root-cause': 'igraph.text',

  // ─── Schematic ──────────────────────────────────────────────────────────
  'resistor': 'igraph.resistor',
  'capacitor': 'igraph.capacitor',
  'inductor': 'igraph.inductor',
  'voltage': 'igraph.voltage',
  'ground': 'igraph.ground',
  'diode': 'igraph.diode',
  'transistor': 'igraph.transistor',
  'ic': 'igraph.ic',
  'opamp': 'igraph.opamp',
  'switch': 'igraph.switch',
  'fuse': 'igraph.fuse',
  'transformer': 'igraph.transformer',

  // ─── Use Case ───────────────────────────────────────────────────────────
  'use-case': 'igraph.ellipse',
  'uc-actor': 'igraph.actor',
  'system-boundary': 'igraph.rectangle',
  'association': 'igraph.line',
  'include-rel': 'igraph.dashedArrow',
  'extend-rel': 'igraph.dashedArrowBack',
  'generalization': 'igraph.triangleArrow',

  // ─── Activity ───────────────────────────────────────────────────────────
  'start-node': 'igraph.initialNode',
  'action': 'igraph.roundedRectangle',
  'decision-node': 'igraph.diamond',
  'fork': 'igraph.forkJoin',
  'join': 'igraph.forkJoin',
  'end-node': 'igraph.finalNode',
  'flow-edge': 'igraph.connectorArrow',
  'swimlane': 'igraph.rectangle',

  // ─── Sequence ───────────────────────────────────────────────────────────
  'seq-actor': 'igraph.actor',
  'lifeline': 'igraph.lifeline',
  'activation': 'igraph.activation',
  'sync-msg': 'igraph.filledArrow',
  'async-msg': 'igraph.openArrow',
  'return-msg': 'igraph.dashedArrow',
  'self-call': 'igraph.loopArrow',
  'create-msg': 'igraph.createArrow',
  'destruction': 'igraph.destruction',
  'combined-fragment': 'igraph.dashedRect',

  // ─── Class ──────────────────────────────────────────────────────────────
  'class-box': 'igraph.classBox',
  'uml-interface': 'igraph.interface',
  'abstract-class': 'igraph.abstractClass',
  'inheritance': 'igraph.triangleArrow',
  'aggregation': 'igraph.aggregation',
  'composition': 'igraph.composition',
  'dependency': 'igraph.dashedArrow',
  'multiplicity': 'igraph.multiplicity',
};

export const IGRAPH_STYLE_MAP: Record<string, string> = {
  // ─── FDD Shapes ──────────────────────────────────────────────────────────
  'FDD_FunctionShape': 'igraph.fdd.function',
  'FDD_InputShape': 'igraph.fdd.input',
  'FDD_OutputShape': 'igraph.fdd.output',
  'FDD_ControlShape': 'igraph.fdd.control',
  'FDD_MechanismShape': 'igraph.fdd.mechanism',
  'FDD_InterfaceShape': 'igraph.fdd.interface',
  'FDD_BoundaryShape': 'igraph.fdd.boundary',
  'FDD_NoteShape': 'igraph.fdd.note',
  'FDD_ExternalEntityShape': 'igraph.fdd.externalEntity',

  // ─── Standard ───────────────────────────────────────────────────────────
  'RectShape': 'igraph.rectangle',
  'RoundedRectShape': 'igraph.roundedRectangle',
  'CircleShape': 'igraph.circle',
  'EllipseShape': 'igraph.ellipse',
  'DiamondShape': 'igraph.diamond',
  'TriangleShape': 'igraph.triangle',
  'ParallelogramShape': 'igraph.parallelogram',
  'CylinderShape': 'igraph.cylinder',
  'DocumentShape': 'igraph.document',
  'FolderShape': 'igraph.folder',
  'CloudShape': 'igraph.cloud',
  'NoteStandaloneShape': 'igraph.noteStandalone',
  'ActorShape': 'igraph.actor',
  'ConnectorArrowShape': 'igraph.connectorArrow',

  // ─── Flowchart Shapes ──────────────────────────────────────────────────
  'PentagonShape': 'igraph.pentagon',
  'TrapezoidShape': 'igraph.trapezoid',
  'DShape': 'igraph.dshape',
  'HexagonShape': 'igraph.hexagon',
  'DisplayShape': 'igraph.display',
  'AnnotationShape': 'igraph.annotation',

  // ─── Basic (legacy) ────────────────────────────────────────────────────
  'DoubleRectShape': 'igraph.doubleRectangle',
  'DoubleRhombusShape': 'igraph.doubleRhombus',
  'MultiOvalShape': 'igraph.multiOval',
  'LineShape': 'igraph.line',
  'TextShape': 'igraph.text',
  'DashedRectShape': 'igraph.dashedRect',
  'PredefinedShape': 'igraph.predefined',

  // ─── UML ────────────────────────────────────────────────────────────────
  'InitialNodeShape': 'igraph.initialNode',
  'FinalNodeShape': 'igraph.finalNode',
  'ForkJoinShape': 'igraph.forkJoin',
  'LifelineShape': 'igraph.lifeline',
  'ActivationShape': 'igraph.activation',
  'ClassBoxShape': 'igraph.classBox',
  'InterfaceShape': 'igraph.interface',
  'AbstractClassShape': 'igraph.abstractClass',

  // ─── ERD ────────────────────────────────────────────────────────────────
  'EntityShape': 'igraph.entity',
  'WeakEntityShape': 'igraph.weakEntity',
  'AttributeShape': 'igraph.attribute',
  'PrimaryKeyShape': 'igraph.primaryKey',
  'DerivedAttrShape': 'igraph.derivedAttr',
  'CompositeAttrShape': 'igraph.compositeAttr',
  'MultiAttrShape': 'igraph.multiAttr',
  'RelationshipShape': 'igraph.relationship',
  'IdentifyingRelShape': 'igraph.identifyingRel',
  'CardinalityShape': 'igraph.cardinality',
  'CrowOneShape': 'igraph.crowOne',
  'CrowZeroOneShape': 'igraph.crowZeroOne',
  'CrowZeroManyShape': 'igraph.crowZeroMany',
  'CrowOneManyShape': 'igraph.crowOneMany',
  'CrowManyShape': 'igraph.crowMany',
  'TotalParticipationShape': 'igraph.totalParticipation',
  'PartialParticipationShape': 'igraph.partialParticipation',
  'ERDConnectorShape': 'igraph.erdConnector',

  // ─── Arrows ─────────────────────────────────────────────────────────────
  'ArrowShape': 'igraph.arrow',
  'ArrowDownShape': 'igraph.arrowDown',
  'ArrowRightShape': 'igraph.arrowRight',
  'FilledArrowShape': 'igraph.filledArrow',
  'OpenArrowShape': 'igraph.openArrow',
  'DashedArrowShape': 'igraph.dashedArrow',
  'DashedArrowBackShape': 'igraph.dashedArrowBack',
  'TriangleArrowShape': 'igraph.triangleArrow',
  'LoopArrowShape': 'igraph.loopArrow',
  'CreateArrowShape': 'igraph.createArrow',
  'DestructionShape': 'igraph.destruction',
  'AggregationShape': 'igraph.aggregation',
  'CompositionShape': 'igraph.composition',
  'MultiplicityShape': 'igraph.multiplicity',
  'ArrowDiagShape': 'igraph.arrowDiag',
  'ArrowSmallShape': 'igraph.arrowSmall',

  // ─── Schematic ─────────────────────────────────────────────────────────
  'ResistorShape': 'igraph.resistor',
  'CapacitorShape': 'igraph.capacitor',
  'InductorShape': 'igraph.inductor',
  'VoltageShape': 'igraph.voltage',
  'GroundShape': 'igraph.ground',
  'DiodeShape': 'igraph.diode',
  'TransistorShape': 'igraph.transistor',
  'ICShape': 'igraph.ic',
  'OpAmpShape': 'igraph.opamp',
  'SwitchShape': 'igraph.switch',
  'FuseShape': 'igraph.fuse',
  'TransformerShape': 'igraph.transformer',
};