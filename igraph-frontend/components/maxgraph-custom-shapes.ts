import {
  Shape,
  AbstractCanvas2D,
  ShapeRegistry,
} from '@maxgraph/core';

// ════════════════════════════════════════════════════════════════════════════
// FDD SHAPES - Canvas implementations
// ════════════════════════════════════════════════════════════════════════════

// ─── 1. FUNCTION SHAPE ─────────────────────────────────────────────────────
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
class FDD_InputShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.08;
    const cy = y + h / 2;
    c.setFillColor('#DCEFD2');
    c.setStrokeColor('#5A9E4B');
    c.setStrokeWidth(2);
    c.roundrect(x + 1, y + 1, w - 2, h - 2, r, r);
    c.fillAndStroke();
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
class FDD_OutputShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.08;
    const cy = y + h / 2;
    c.setFillColor('#FBE8B8');
    c.setStrokeColor('#F39C12');
    c.setStrokeWidth(2);
    c.roundrect(x + 1, y + 1, w - 2, h - 2, r, r);
    c.fillAndStroke();
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
class FDD_ControlShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#000000');
    c.setStrokeWidth(2);
    c.setFillColor('#000000');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 12, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - 12, cy - 6);
    c.lineTo(x + w - 12, cy + 6);
    c.close();
    c.fillAndStroke();
  }
}

// ─── 5. MECHANISM ──────────────────────────────────────────────────────
class FDD_MechanismShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#000000');
    c.setStrokeWidth(2);
    c.setFillColor('#000000');
    c.setDashed(true);
    c.setDashPattern('8 4');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 12, cy);
    c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - 12, cy - 6);
    c.lineTo(x + w - 12, cy + 6);
    c.close();
    c.fillAndStroke();
  }
}

// ─── 6. INTERFACE CONNECTOR ─────────────────────────────────────────────
class FDD_InterfaceShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrowSize = 6;
    const arrowWidth = 12;
    c.setStrokeColor('#000000');
    c.setStrokeWidth(2);
    c.setFillColor('#000000');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + arrowWidth, cy - arrowSize);
    c.lineTo(x + arrowWidth, cy + arrowSize);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrowWidth, cy - arrowSize);
    c.lineTo(x + w - arrowWidth, cy + arrowSize);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + arrowWidth, cy);
    c.lineTo(x + w - arrowWidth, cy);
    c.stroke();
  }
}

// ─── 7. BOUNDARY ──────────────────────────────────────────────────────
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

// ─── 8. NOTE ──────────────────────────────────────────────────────────────
class FDD_NoteShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const fold = Math.min(w, h) * 0.18;
    c.setFillColor('#FFF4CC');
    c.setStrokeColor('#B7950B');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 1, y + 1);
    c.lineTo(x + w - fold - 1, y + 1);
    c.lineTo(x + w - 1, y + fold + 1);
    c.lineTo(x + w - 1, y + h - 1);
    c.lineTo(x + 1, y + h - 1);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + w - fold - 1, y + 1);
    c.lineTo(x + w - fold - 1, y + fold + 1);
    c.stroke();
    c.begin();
    c.moveTo(x + w - fold - 1, y + fold + 1);
    c.lineTo(x + w - 1, y + fold + 1);
    c.stroke();
  }
}

// ─── 9. EXTERNAL ENTITY ───────────────────────────────────────────
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
// DFD SHAPES
// ════════════════════════════════════════════════════════════════════════════

class DFDProcessShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2 - 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.fillAndStroke();
  }
}

class DFDDataFlowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 10;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - 5);
    c.lineTo(x + w - arrow - 2, cy + 5);
    c.close();
    c.fill();
  }
}

class DFDDataStoreShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const y1 = y + h * 0.2;
    const y2 = y + h * 0.8;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, y1);
    c.lineTo(x + w - 2, y1);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, y2);
    c.lineTo(x + w - 2, y2);
    c.stroke();
  }
}

class DFDDataStoreGSShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + w * 0.2, y + 2);
    c.lineTo(x + w * 0.2, y + h - 2);
    c.stroke();
  }
}

class DFDExternalEntityShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class DFDBidirectionalShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 10;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + arrow + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + arrow + 2, cy - 5);
    c.lineTo(x + arrow + 2, cy + 5);
    c.close();
    c.fill();
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - 5);
    c.lineTo(x + w - arrow - 2, cy + 5);
    c.close();
    c.fill();
  }
}

class DFDBoundaryShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setDashed(true);
    c.setDashPattern('8 6');
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
    c.setDashed(false);
  }
}

class DFDNoteShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const fold = Math.min(w, h) * 0.2;
    c.setFillColor('#fef9c3');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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

class DFDOnPageShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2 - 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.fillAndStroke();
    const r2 = r * 0.3;
    c.ellipse(cx - r2, cy - r2, r2 * 2, r2 * 2);
    c.fill();
  }
}

class DFDOffPageShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + w - 2, y + 2);
    c.lineTo(x + w - 2, y + h * 0.65);
    c.lineTo(cx, y + h - 2);
    c.lineTo(x + 2, y + h * 0.65);
    c.close();
    c.fillAndStroke();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FISHBONE SHAPES
// ════════════════════════════════════════════════════════════════════════════

class FishboneSpineShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class FishboneHeadShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(x + w - 2, y + h / 2);
    c.lineTo(cx, y + h - 2);
    c.close();
    c.fillAndStroke();
  }
}

class FishboneProblemShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.1;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.roundrect(x + 2, y + 2, w - 4, h - 4, r, r);
    c.stroke();
    c.setDashed(false);
  }
}

class FishboneCauseTopShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, y + h - 2);
    c.lineTo(x + w - 2, y + 2);
    c.stroke();
  }
}

class FishboneCauseBottomShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + w - 2, y + h - 2);
    c.stroke();
  }
}

class FishboneSubCauseTopShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, y + h - 2);
    c.lineTo(x + w - 2, y + 2);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.6, y + h * 0.4);
    c.lineTo(x + w - 2, y + h * 0.4);
    c.stroke();
  }
}

class FishboneSubCauseBottomShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + w - 2, y + h - 2);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.6, y + h * 0.6);
    c.lineTo(x + w - 2, y + h * 0.6);
    c.stroke();
  }
}

class FishboneTertiaryShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(1.5);
    c.begin();
    c.moveTo(x + 2, y + h - 2);
    c.lineTo(x + w - 2, y + 2);
    c.stroke();
  }
}

// FIXED: Fishbone Arrow - matches SVG preview
class FishboneArrowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = Math.min(w, h) * 0.35;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - arrow / 2);
    c.lineTo(x + w - arrow - 2, cy + arrow / 2);
    c.close();
    c.fillAndStroke();
  }
}

class FishboneDashedArrowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = Math.min(w, h) * 0.35;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - arrow / 2);
    c.lineTo(x + w - arrow - 2, cy + arrow / 2);
    c.close();
    c.fillAndStroke();
  }
}

class FishboneCategoryShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.1;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.roundrect(x + 2, y + 2, w - 4, h - 4, r, r);
    c.fillAndStroke();
  }
}

class FishboneBubbleShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class FishboneNoteShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const fold = Math.min(w, h) * 0.2;
    c.setFillColor('#fef9c3');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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

// ════════════════════════════════════════════════════════════════════════════
// SCHEMATIC SHAPES
// ════════════════════════════════════════════════════════════════════════════

class SchematicBatteryShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w * 0.35, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.35, y + h * 0.2);
    c.lineTo(x + w * 0.35, y + h * 0.8);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.45, y + h * 0.3);
    c.lineTo(x + w * 0.45, y + h * 0.7);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.45, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.setFontColor('#1a1f36');
    c.setFontSize(10);
    c.text(x + w * 0.15, y + h * 0.2, 0, 0, '+', 'center', 'middle', false, '', 'hidden', false, 0, '');
  }
}

class SchematicACShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.33;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(cx - r, cy);
    c.stroke();
    c.begin();
    c.moveTo(cx + r, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.stroke();
    c.begin();
    c.moveTo(cx - r * 0.5, cy);
    c.quadTo(cx, cy - r * 0.6, cx + r * 0.7, cy);
    c.stroke();
  }
}

class SchematicGroundShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(cx, y + h * 0.35);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.2, y + h * 0.35);
    c.lineTo(x + w * 0.8, y + h * 0.35);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.28, y + h * 0.55);
    c.lineTo(x + w * 0.72, y + h * 0.55);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.36, y + h * 0.75);
    c.lineTo(x + w * 0.64, y + h * 0.75);
    c.stroke();
  }
}

class SchematicResistorShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const s = h * 0.2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w * 0.15, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.15, cy - s);
    c.lineTo(x + w * 0.23, cy + s);
    c.lineTo(x + w * 0.31, cy - s);
    c.lineTo(x + w * 0.39, cy + s);
    c.lineTo(x + w * 0.47, cy - s);
    c.lineTo(x + w * 0.55, cy + s);
    c.lineTo(x + w * 0.63, cy - s);
    c.lineTo(x + w * 0.71, cy + s);
    c.lineTo(x + w * 0.79, cy - s);
    c.lineTo(x + w * 0.87, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.87, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class SchematicVariableResistorShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const s = h * 0.15;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w * 0.15, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.15, cy - s);
    c.lineTo(x + w * 0.23, cy + s);
    c.lineTo(x + w * 0.31, cy - s);
    c.lineTo(x + w * 0.39, cy + s);
    c.lineTo(x + w * 0.47, cy - s);
    c.lineTo(x + w * 0.55, cy + s);
    c.lineTo(x + w * 0.63, cy - s);
    c.lineTo(x + w * 0.71, cy + s);
    c.lineTo(x + w * 0.79, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.79, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.2, y + h * 0.85);
    c.lineTo(x + w * 0.55, y + h * 0.25);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.55, y + h * 0.25);
    c.lineTo(x + w * 0.48, y + h * 0.3);
    c.lineTo(x + w * 0.52, y + h * 0.38);
    c.close();
    c.fill();
  }
}

class SchematicCapacitorShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const x1 = x + w * 0.4;
    const x2 = x + w * 0.6;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x1, cy);
    c.stroke();
    c.begin();
    c.moveTo(x1, y + h * 0.1);
    c.lineTo(x1, y + h * 0.9);
    c.stroke();
    c.begin();
    c.moveTo(x2, y + h * 0.15);
    c.lineTo(x2, y + h * 0.85);
    c.stroke();
    c.begin();
    c.moveTo(x2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class SchematicInductorShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const coils = 4;
    const spacing = (w - 8) / (coils * 2 + 1);
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + 2 + spacing, cy);
    for (let i = 0; i < coils; i++) {
      const x1 = x + 2 + (i * 2 + 1) * spacing;
      const x2 = x + 2 + (i * 2 + 2) * spacing;
      const mid = (x1 + x2) / 2;
      c.quadTo(mid, cy - h * 0.35, x2, cy);
    }
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class SchematicDiodeShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#ffffff');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w * 0.3, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.3, cy - h * 0.35);
    c.lineTo(x + w * 0.3, cy + h * 0.35);
    c.lineTo(x + w * 0.55, cy);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + w * 0.55, y + h * 0.2);
    c.lineTo(x + w * 0.55, y + h * 0.8);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.55, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class SchematicLEDShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#ffffff');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w * 0.25, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.25, cy - h * 0.3);
    c.lineTo(x + w * 0.25, cy + h * 0.3);
    c.lineTo(x + w * 0.45, cy);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + w * 0.45, y + h * 0.2);
    c.lineTo(x + w * 0.45, y + h * 0.8);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.45, cy);
    c.lineTo(x + w * 0.7, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.55, y + h * 0.2);
    c.lineTo(x + w * 0.7, y + h * 0.05);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.62, y + h * 0.3);
    c.lineTo(x + w * 0.77, y + h * 0.15);
    c.stroke();
  }
}

class SchematicNPNShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.25;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(cx - r, cy);
    c.stroke();
    c.begin();
    c.moveTo(cx, cy - r);
    c.lineTo(cx, y + 2);
    c.stroke();
    c.begin();
    c.moveTo(cx, cy + r);
    c.lineTo(x + w * 0.7, y + h - 2);
    c.stroke();
    c.begin();
    c.moveTo(cx, y + h - 2);
    c.lineTo(cx - 4, y + h - 10);
    c.lineTo(cx + 4, y + h - 10);
    c.close();
    c.fill();
  }
}

class SchematicSwitchShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h * 0.6;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w * 0.2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.8, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.25, cy);
    c.lineTo(x + w * 0.6, y + h * 0.2);
    c.stroke();
    c.ellipse(x + w * 0.2 - 3, cy - 3, 6, 6);
    c.fill();
    c.ellipse(x + w * 0.8 - 3, cy - 3, 6, 6);
    c.fill();
  }
}

class SchematicFuseShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#ffffff');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w * 0.25, cy);
    c.stroke();
    c.rect(x + w * 0.25, y + h * 0.2, w * 0.5, h * 0.6);
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + w * 0.75, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.35, cy);
    c.lineTo(x + w * 0.65, cy);
    c.stroke();
  }
}

class SchematicConnectionShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const cx = x + w / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.ellipse(cx - 4, cy - 4, 8, 8);
    c.fill();
  }
}

class SchematicNoConnectionShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const cx = x + w / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(cx, y + h - 2);
    c.stroke();
  }
}

// ─── Schematic IC Shape ──────────────────────────────────────────────────────
class SchematicICShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    const pinCount = 8;
    const pinSpacing = (w - 12) / (pinCount - 1);
    for (let i = 0; i < pinCount; i++) {
      const px = x + 4 + i * pinSpacing;
      c.begin();
      c.moveTo(px, y + 2);
      c.lineTo(px, y - 4);
      c.stroke();
      c.begin();
      c.moveTo(px, y + h - 2);
      c.lineTo(px, y + h + 4);
      c.stroke();
    }
    c.begin();
    c.moveTo(cx - 8, y + 2);
    c.lineTo(cx + 8, y + 2);
    c.stroke();
  }
}

// ─── Schematic OpAmp Shape ──────────────────────────────────────────────────
class SchematicOpAmpShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(cx + 2, y + 2);
    c.lineTo(cx + 2, y + h - 2);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + 2, cy - 10);
    c.lineTo(x - 6, cy - 10);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, cy + 10);
    c.lineTo(x - 6, cy + 10);
    c.stroke();
    c.begin();
    c.moveTo(cx + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.text(x - 2, cy - 10, 0, 0, '-', 'right', 'middle', false, '', 'hidden', false, 0, '');
    c.text(x - 2, cy + 10, 0, 0, '+', 'right', 'middle', false, '', 'hidden', false, 0, '');
  }
}

// ─── Schematic Transformer Shape ────────────────────────────────────────────
class SchematicTransformerShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const coils = 3;
    const spacing = (w - 12) / (coils * 2 + 1);
    const y1 = y + h * 0.15;
    const y2 = y + h * 0.85;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 4, y1);
    for (let i = 0; i < coils; i++) {
      const x1 = x + 4 + (i * 2 + 1) * spacing;
      const x2 = x + 4 + (i * 2 + 2) * spacing;
      const mid = (x1 + x2) / 2;
      c.quadTo(mid, y1 - (h * 0.08), x2, y1);
    }
    c.stroke();
    c.begin();
    c.moveTo(x + 4, y2);
    for (let i = 0; i < coils; i++) {
      const x1 = x + 4 + (i * 2 + 1) * spacing;
      const x2 = x + 4 + (i * 2 + 2) * spacing;
      const mid = (x1 + x2) / 2;
      c.quadTo(mid, y2 + (h * 0.08), x2, y2);
    }
    c.stroke();
    c.begin();
    c.moveTo(cx, y1 + 6);
    c.lineTo(cx, y2 - 6);
    c.stroke();
    c.begin();
    c.moveTo(cx - 2, y1 - 4);
    c.lineTo(cx - 2, y + 2);
    c.stroke();
    c.begin();
    c.moveTo(cx + 2, y2 + 4);
    c.lineTo(cx + 2, y + h - 2);
    c.stroke();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// USE CASE SHAPES
// ════════════════════════════════════════════════════════════════════════════

class UMLIncludeShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 12;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - 5);
    c.lineTo(x + w - arrow - 2, cy + 5);
    c.close();
    c.fill();
  }
}

class UMLExtendShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 12;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(x + arrow + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + arrow + 2, cy - 5);
    c.lineTo(x + arrow + 2, cy + 5);
    c.close();
    c.fill();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY SHAPES
// ════════════════════════════════════════════════════════════════════════════

class UMLInitialNodeShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2 - 2;
    c.setFillColor('#1a1f36');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(0);
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.fill();
  }
}

class UMLMergeShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const bar = Math.min(h, 10);
    const yPos = y + (h - bar) / 2;
    c.setFillColor('#1a1f36');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(0);
    c.rect(x + 2, yPos, w - 4, bar);
    c.fill();
  }
}

class UMLForkShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const bar = Math.min(h, 10);
    const yPos = y + (h - bar) / 2;
    c.setFillColor('#1a1f36');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(0);
    c.rect(x + 2, yPos, w - 4, bar);
    c.fill();
  }
}

class UMLControlFlowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 10;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - 5);
    c.lineTo(x + w - arrow - 2, cy + 5);
    c.close();
    c.fill();
  }
}

class UMLObjectFlowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 10;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - 5);
    c.lineTo(x + w - arrow - 2, cy + 5);
    c.close();
    c.fill();
  }
}

class UMLActivityFinalShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2 - 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.stroke();
    const r2 = r * 0.5;
    c.ellipse(cx - r2, cy - r2, r2 * 2, r2 * 2);
    c.fill();
  }
}

class UMLFlowFinalShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2 - 2;
    const p = r * 0.5;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.stroke();
    c.begin();
    c.moveTo(cx - p, cy - p);
    c.lineTo(cx + p, cy + p);
    c.stroke();
    c.begin();
    c.moveTo(cx + p, cy - p);
    c.lineTo(cx - p, cy + p);
    c.stroke();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SEQUENCE SHAPES
// ════════════════════════════════════════════════════════════════════════════

class UMLSyncMsgShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 12;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - 6);
    c.lineTo(x + w - arrow - 2, cy + 6);
    c.close();
    c.fill();
  }
}

class UMLAsyncMsgShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 12;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - 6);
    c.lineTo(x + w - arrow - 2, cy + 6);
    c.close();
    c.stroke();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CLASS SHAPES
// ════════════════════════════════════════════════════════════════════════════

class UMLCompositionShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const d = 14;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + d * 2 + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + 2 + d, cy - d);
    c.lineTo(x + 2 + d * 2, cy);
    c.lineTo(x + 2 + d, cy + d);
    c.close();
    c.fill();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BASIC SHAPES - Canvas implementations
// ════════════════════════════════════════════════════════════════════════════

class RectangleShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class RoundedRectShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.15;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.roundrect(x + 2, y + 2, w - 4, h - 4, r, r);
    c.fillAndStroke();
  }
}

class CircleShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2 - 4;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.fillAndStroke();
  }
}

class EllipseShapeCanvas extends Shape {

    paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(x + 1, y + 1, w - 2, h - 2);
    c.fillAndStroke();
  }
}

class DiamondShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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
    const rx = (w - 4) / 2;
    const ry = 6;
    const cx = x + w / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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
    c.setFillColor('#fef9c3');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.4;
    c.setFillColor('#e0f2fe');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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

// FIXED: Note Standalone - matches SVG preview
class NoteStandaloneShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const fold = Math.min(w, h) * 0.2;
    c.setFillColor('#fef9c3');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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

// FIXED: Actor - matches SVG preview
class ActorShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const headR = Math.min(w, h) * 0.12;
    const headCY = y + headR + 4;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - headR, headCY - headR, headR * 2, headR * 2);
    c.stroke();
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
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
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
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.rect(x + 6, y + 6, w - 12, h - 12);
    c.stroke();
  }
}

class DoubleRhombusShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.ellipse(x + 6, y + 6, w - 12, h - 12);
    c.stroke();
  }
}

class LineShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class TextShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(1);
    c.setDashed(true);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
    c.setDashed(false);
  }
}

class DashedRectShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setDashed(true);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.setDashed(false);
  }
}

class PredefinedShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    const m = 8;
    c.begin(); c.moveTo(x + m, y + 2); c.lineTo(x + m, y + h - 2); c.stroke();
    c.begin(); c.moveTo(x + w - m, y + 2); c.lineTo(x + w - m, y + h - 2); c.stroke();
  }
}

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

// FIXED: Hexagon (Preparation) - matches SVG preview
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

// ─── UML Base Shapes ────────────────────────────────────────────────────

class InitialNodeSolid extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) / 2 - 4;
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#1a1f36');
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.fill();
  }
}

class FinalNodeShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) / 2 - 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.ellipse(cx - r, cy - r, r * 2, r * 2);
    c.stroke();
    const r2 = r * 0.55;
    c.ellipse(cx - r2, cy - r2, r2 * 2, r2 * 2);
    c.fill();
  }
}

class ForkJoinShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#1a1f36');
    c.rect(x + 2, y + h / 2 - 6, w - 4, 12);
    c.fill();
  }
}

class LifelineShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const boxH = h * 0.25;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + w * 0.1, y + 2, w * 0.8, boxH);
    c.fillAndStroke();
    c.setDashed(true);
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(1.5);
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
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(1);
    c.setDashed(true);
    c.begin(); c.moveTo(cx, y + 2); c.lineTo(cx, y + h - 2); c.stroke();
    c.setDashed(false);
    const bw = 10;
    const bh = h * 0.5;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(cx - bw / 2, y + h * 0.25, bw, bh);
    c.fillAndStroke();
  }
}

class ClassBoxShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    const h1 = h * 0.3;
    const h2 = h * 0.6;
    c.begin(); c.moveTo(x + 2, y + h1 + 2); c.lineTo(x + w - 2, y + h1 + 2); c.stroke();
    c.begin(); c.moveTo(x + 2, y + h2 + 2); c.lineTo(x + w - 2, y + h2 + 2); c.stroke();
  }
}

class UMLInterfaceShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    const h1 = h * 0.3;
    const h2 = h * 0.6;
    c.begin(); c.moveTo(x + 2, y + h1 + 2); c.lineTo(x + w - 2, y + h1 + 2); c.stroke();
    c.begin(); c.moveTo(x + 2, y + h2 + 2); c.lineTo(x + w - 2, y + h2 + 2); c.stroke();
    c.setDashed(true);
    c.begin(); c.moveTo(x + w * 0.25, y + h1 * 0.5 + 4); c.lineTo(x + w * 0.75, y + h1 * 0.5 + 4); c.stroke();
    c.setDashed(false);
  }
}

// ─── ERD Shapes ────────────────────────────────────────────────────────

class EntityShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class WeakEntityShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.rect(x + 6, y + 6, w - 12, h - 12);
    c.stroke();
  }
}

// FIXED: ERD Attribute - matches SVG preview (ellipse)
class ERDAttributeShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

// FIXED: ERD Multivalued Attribute - matches SVG preview (double ellipse)
class ERDMultivaluedAttributeShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4);
    c.fillAndStroke();
    const inset = 6;
    c.ellipse(cx - w / 2 + 2 + inset, cy - h / 2 + 2 + inset, w - 4 - inset * 2, h - 4 - inset * 2);
    c.stroke();
  }
}

// FIXED: ERD Derived Attribute - matches SVG preview (dashed ellipse)
class ERDDerivedAttributeShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.ellipse(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.setDashed(false);
  }
}

// FIXED: ERD Relationship - matches SVG preview (diamond)
class RelationshipShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(x + w - 2, cy);
    c.lineTo(cx, y + h - 2);
    c.lineTo(x + 2, cy);
    c.close();
    c.fillAndStroke();
  }
}

// FIXED: ERD Identifying Relationship - matches SVG preview (double diamond)
class IdentifyingRelShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(x + w - 2, cy);
    c.lineTo(cx, y + h - 2);
    c.lineTo(x + 2, cy);
    c.close();
    c.fillAndStroke();
    const inset = 6;
    c.begin();
    c.moveTo(cx, y + 2 + inset);
    c.lineTo(x + w - 2 - inset, cy);
    c.lineTo(cx, y + h - 2 - inset);
    c.lineTo(x + 2 + inset, cy);
    c.close();
    c.stroke();
  }
}

class CardinalityShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
  }
}

class CrowOneShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + w - 2, y + 4); c.lineTo(x + w - 2, y + h - 4); c.stroke();
  }
}

class CrowZeroOneShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.22;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - r * 2 - 4, cy); c.stroke();
    c.ellipse(x + w - r * 2 - 4, cy - r, r * 2, r * 2); c.stroke();
    c.begin(); c.moveTo(x + w - r * 2 - 4, cy - r); c.lineTo(x + w - r * 2 - 4, cy + r); c.stroke();
  }
}

class CrowZeroManyShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.18;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + w - 2, cy - r * 1.5); c.lineTo(x + w - 2, cy + r * 1.5); c.stroke();
    c.begin(); c.moveTo(x + w - r - 2, cy - r * 1.2); c.lineTo(x + w - 2, cy); c.lineTo(x + w - r - 2, cy + r * 1.2); c.stroke();
  }
}

class CrowManyShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.22;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + w - r - 2, cy - r * 1.4); c.lineTo(x + w - 2, cy); c.lineTo(x + w - r - 2, cy + r * 1.4); c.stroke();
  }
}

class TotalParticipationShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + 6, y + 4); c.lineTo(x + 6, y + h - 4); c.stroke();
    c.begin(); c.moveTo(x + 11, y + 4); c.lineTo(x + 11, y + h - 4); c.stroke();
  }
}

class PartialParticipationShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
    c.begin(); c.moveTo(x + 6, y + 4); c.lineTo(x + 6, y + h - 4); c.stroke();
  }
}

class ERDConnectorShape extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin(); c.moveTo(x + 2, cy); c.lineTo(x + w - 2, cy); c.stroke();
  }
}

// ─── Arrow Shapes ──────────────────────────────────────────────────────

class ArrowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 10, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 10, cy - 5);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 5);
    c.close();
    c.fill();
  }
}

class ArrowDownShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(cx, y + h - 10);
    c.stroke();
    c.begin();
    c.moveTo(cx - 5, y + h - 10);
    c.lineTo(cx, y + h - 2);
    c.lineTo(cx + 5, y + h - 10);
    c.close();
    c.fill();
  }
}

class ArrowRightShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 10, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 10, cy - 6);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 6);
    c.close();
    c.fill();
  }
}

class OpenArrowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 10, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 10, cy - 6);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 6);
    c.close();
    c.stroke();
  }
}

class DashedArrowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.setDashed(true);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 10, cy);
    c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + w - 10, cy - 5);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 5);
    c.close();
    c.fill();
  }
}

class DashedArrowBackShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.setDashed(true);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + 12, cy - 5);
    c.lineTo(x + 2, cy);
    c.lineTo(x + 12, cy + 5);
    c.close();
    c.fill();
  }
}

class TriangleArrowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 12, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 12, cy - 8);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 12, cy + 8);
    c.close();
    c.stroke();
  }
}

class LoopArrowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
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

class CreateArrowShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 10, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 10, cy - 5);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 10, cy + 5);
    c.close();
    c.fill();
  }
}

class DestructionShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const s = Math.min(w, h) * 0.3;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(cx - s, cy - s);
    c.lineTo(cx + s, cy + s);
    c.stroke();
    c.begin();
    c.moveTo(cx + s, cy - s);
    c.lineTo(cx - s, cy + s);
    c.stroke();
  }
}

class AggregationShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#ffffff');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + 12, cy - 7);
    c.lineTo(x + 22, cy);
    c.lineTo(x + 12, cy + 7);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + 22, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class CompositionShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + 12, cy - 7);
    c.lineTo(x + 22, cy);
    c.lineTo(x + 12, cy + 7);
    c.close();
    c.fill();
    c.begin();
    c.moveTo(x + 22, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class MultiplicityShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + h / 2 - 6, w - 4, 12);
    c.stroke();
  }
}

class ArrowDiagShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#1a1f36');
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

class ArrowSmallShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(1.5);
    c.setFillColor('#1a1f36');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 8, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 8, cy - 4);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - 8, cy + 4);
    c.close();
    c.fill();
  }
}

// ─── ERD Additional Shapes ──────────────────────────────────────────────

class ERDEntityShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class ERDWeakEntityShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    const inset = 6;
    c.rect(x + 2 + inset, y + 2 + inset, w - 4 - inset * 2, h - 4 - inset * 2);
    c.stroke();
  }
}

class ERDRelationshipShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(x + w - 2, cy);
    c.lineTo(cx, y + h - 2);
    c.lineTo(x + 2, cy);
    c.close();
    c.fillAndStroke();
  }
}

class ERDIdentifyingRelShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(x + w - 2, cy);
    c.lineTo(cx, y + h - 2);
    c.lineTo(x + 2, cy);
    c.close();
    c.fillAndStroke();
    const inset = 6;
    c.begin();
    c.moveTo(cx, y + 2 + inset);
    c.lineTo(x + w - 2 - inset, cy);
    c.lineTo(cx, y + h - 2 - inset);
    c.lineTo(x + 2 + inset, cy);
    c.close();
    c.stroke();
  }
}

class ERDCardinality11ShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h * 0.65;
    c.setFontColor('#1a1f36');
    c.setFontSize(12);
    c.text(x + w * 0.15, y + h * 0.45, 0, 0, '1', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.text(x + w * 0.85, y + h * 0.45, 0, 0, '1', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class ERDCardinality1NShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h * 0.65;
    c.setFontColor('#1a1f36');
    c.setFontSize(12);
    c.text(x + w * 0.15, y + h * 0.45, 0, 0, '1', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.text(x + w * 0.85, y + h * 0.45, 0, 0, 'N', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class ERDCardinalityN1ShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h * 0.65;
    c.setFontColor('#1a1f36');
    c.setFontSize(12);
    c.text(x + w * 0.15, y + h * 0.45, 0, 0, 'N', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.text(x + w * 0.85, y + h * 0.45, 0, 0, '1', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class ERDCardinalityMNShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h * 0.65;
    c.setFontColor('#1a1f36');
    c.setFontSize(12);
    c.text(x + w * 0.15, y + h * 0.45, 0, 0, 'M', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.text(x + w * 0.85, y + h * 0.45, 0, 0, 'N', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

// ─── Use Case Shapes ──────────────────────────────────────────────────────

class UCActorShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const head = Math.min(w, h) * 0.15;
    const headCY = y + head + 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - head, headCY - head, head * 2, head * 2);
    c.stroke();
    const bodyTop = headCY + head;
    const bodyBot = y + h * 0.58;
    c.begin();
    c.moveTo(cx, bodyTop);
    c.lineTo(cx, bodyBot);
    c.stroke();
    c.begin();
    c.moveTo(x + w * 0.2, y + h * 0.38);
    c.lineTo(x + w * 0.8, y + h * 0.38);
    c.stroke();
    c.begin();
    c.moveTo(cx, bodyBot);
    c.lineTo(x + w * 0.2, y + h - 2);
    c.stroke();
    c.begin();
    c.moveTo(cx, bodyBot);
    c.lineTo(x + w * 0.8, y + h - 2);
    c.stroke();
  }
}

// FIXED: Use Case - matches SVG preview (ellipse)
class UMLUseCaseShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.ellipse(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4);
    c.fillAndStroke();
  }
}

class UMLSystemBoundaryShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
  }
}

class UMLAssociationShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
  }
}

class UMLGeneralizationShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const s = 14;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - s - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - s - 2, cy - s / 2);
    c.lineTo(x + w - 2, cy);
    c.lineTo(x + w - s - 2, cy + s / 2);
    c.close();
    c.stroke();
  }
}

class UMLNoteShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const fold = Math.min(w, h) * 0.2;
    c.setFillColor('#fef9c3');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
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

class UMLNoteConnectorShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.setDashed(false);
  }
}

class UMLIncludeLabelShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFontStyle(2);
    c.setFontColor('#1a1f36');
    c.setFontSize(10);
    c.text(cx, cy + 4, 0, 0, '«include»', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.setFontStyle(0);
  }
}

class UMLExtendLabelShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFontStyle(2);
    c.setFontColor('#1a1f36');
    c.setFontSize(10);
    c.text(cx, cy + 4, 0, 0, '«extend»', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.setFontStyle(0);
  }
}

// ─── Activity Shapes ──────────────────────────────────────────────────────

class UMLConstraintShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.12;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.roundrect(x + 2, y + 2, w - 4, h - 4, r, r);
    c.stroke();
    c.setDashed(false);
  }
}

class UMLActivityShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const r = Math.min(w, h) * 0.15;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.roundrect(x + 2, y + 2, w - 4, h - 4, r, r);
    c.fillAndStroke();
  }
}

class UMLDecisionShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(cx, y + 2);
    c.lineTo(x + w - 2, cy);
    c.lineTo(cx, y + h - 2);
    c.lineTo(x + 2, cy);
    c.close();
    c.fillAndStroke();
  }
}

class UMLSwimlaneShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const header = Math.min(40, h * 0.2);
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + 2, y + header + 2);
    c.lineTo(x + w - 2, y + header + 2);
    c.stroke();
  }
}

// ─── Sequence Shapes ──────────────────────────────────────────────────────

class UMLLifelineShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const header = Math.min(50, h * 0.15);
    const cx = x + w / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + w * 0.1, y + 2, w * 0.8, header);
    c.fillAndStroke();
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(cx, y + header + 2);
    c.lineTo(cx, y + h - 2);
    c.stroke();
    c.setDashed(false);
  }
}

class UMLActivationShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const barW = Math.min(16, w * 0.4);
    const xPos = x + (w - barW) / 2;
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(xPos, y + 2, barW, h - 4);
    c.fillAndStroke();
  }
}

class UMLDestroyShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const p = Math.min(w, h) * 0.2;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + p, y + p);
    c.lineTo(x + w - p, y + h - p);
    c.stroke();
    c.begin();
    c.moveTo(x + w - p, y + p);
    c.lineTo(x + p, y + h - p);
    c.stroke();
  }
}

class UMLReturnMsgShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 12;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(x + arrow + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + arrow + 2, cy - 6);
    c.lineTo(x + arrow + 2, cy + 6);
    c.close();
    c.stroke();
  }
}

class UMLAltShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + 30, y + 2);
    c.lineTo(x + 38, y + 20);
    c.lineTo(x + 38, y + 35);
    c.lineTo(x + 2, y + 35);
    c.close();
    c.stroke();
    c.setFontColor('#1a1f36');
    c.setFontSize(10);
    c.text(x + 16, y + 22, 0, 0, 'alt', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(x + 2, y + h / 2);
    c.lineTo(x + w - 2, y + h / 2);
    c.stroke();
    c.setDashed(false);
  }
}

class UMLOptShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + 30, y + 2);
    c.lineTo(x + 38, y + 20);
    c.lineTo(x + 38, y + 35);
    c.lineTo(x + 2, y + 35);
    c.close();
    c.stroke();
    c.setFontColor('#1a1f36');
    c.setFontSize(10);
    c.text(x + 16, y + 22, 0, 0, 'opt', 'center', 'middle', false, '', 'hidden', false, 0, '');
  }
}

class UMLLoopShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + 35, y + 2);
    c.lineTo(x + 43, y + 20);
    c.lineTo(x + 43, y + 35);
    c.lineTo(x + 2, y + 35);
    c.close();
    c.stroke();
    c.setFontColor('#1a1f36');
    c.setFontSize(10);
    c.text(x + 20, y + 22, 0, 0, 'loop', 'center', 'middle', false, '', 'hidden', false, 0, '');
  }
}

class UMLParShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + 30, y + 2);
    c.lineTo(x + 38, y + 20);
    c.lineTo(x + 38, y + 35);
    c.lineTo(x + 2, y + 35);
    c.close();
    c.stroke();
    c.setFontColor('#1a1f36');
    c.setFontSize(10);
    c.text(x + 16, y + 22, 0, 0, 'par', 'center', 'middle', false, '', 'hidden', false, 0, '');
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(x + 2, y + h / 2);
    c.lineTo(x + w - 2, y + h / 2);
    c.stroke();
    c.setDashed(false);
  }
}

class UMLBreakShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, y + 2);
    c.lineTo(x + 38, y + 2);
    c.lineTo(x + 46, y + 20);
    c.lineTo(x + 46, y + 35);
    c.lineTo(x + 2, y + 35);
    c.close();
    c.stroke();
    c.setFontColor('#1a1f36');
    c.setFontSize(10);
    c.text(x + 22, y + 22, 0, 0, 'break', 'center', 'middle', false, '', 'hidden', false, 0, '');
  }
}

// ─── Class Shapes ──────────────────────────────────────────────────────────

class UMLClassShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    c.setFillColor('#ffffff');
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.rect(x + 2, y + 2, w - 4, h - 4);
    c.fillAndStroke();
    c.begin();
    c.moveTo(x + 2, y + h * 0.3 + 2);
    c.lineTo(x + w - 2, y + h * 0.3 + 2);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, y + h * 0.65 + 2);
    c.lineTo(x + w - 2, y + h * 0.65 + 2);
    c.stroke();
  }
}

class UMLDirectedAssociationShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 14;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - 6);
    c.lineTo(x + w - arrow - 2, cy + 6);
    c.close();
    c.stroke();
  }
}

class UMLAggregationShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const d = 14;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setFillColor('#ffffff');
    c.begin();
    c.moveTo(x + d * 2 + 2, cy);
    c.lineTo(x + w - 2, cy);
    c.stroke();
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + 2 + d, cy - d);
    c.lineTo(x + 2 + d * 2, cy);
    c.lineTo(x + 2 + d, cy + d);
    c.close();
    c.fillAndStroke();
  }
}

class UMLDependencyShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cy = y + h / 2;
    const arrow = 14;
    c.setStrokeColor('#1a1f36');
    c.setStrokeWidth(2);
    c.setDashed(true);
    c.setDashPattern('6 4');
    c.begin();
    c.moveTo(x + 2, cy);
    c.lineTo(x + w - arrow - 2, cy);
    c.stroke();
    c.setDashed(false);
    c.begin();
    c.moveTo(x + w - 2, cy);
    c.lineTo(x + w - arrow - 2, cy - 6);
    c.lineTo(x + w - arrow - 2, cy + 6);
    c.close();
    c.stroke();
  }
}

class UMLMultiplicity1ShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFontColor('#1a1f36');
    c.setFontSize(12);
    c.text(cx, cy + 4, 0, 0, '1', 'center', 'middle', false, '', 'hidden', false, 0, '');
  }
}

class UMLMultiplicity01ShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFontColor('#1a1f36');
    c.setFontSize(11);
    c.text(cx, cy + 4, 0, 0, '0..1', 'center', 'middle', false, '', 'hidden', false, 0, '');
  }
}

class UMLMultiplicityManyShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFontColor('#1a1f36');
    c.setFontSize(14);
    c.text(cx, cy + 4, 0, 0, '*', 'center', 'middle', false, '', 'hidden', false, 0, '');
  }
}

class UMLMultiplicity1ManyShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFontColor('#1a1f36');
    c.setFontSize(11);
    c.text(cx, cy + 4, 0, 0, '1..*', 'center', 'middle', false, '', 'hidden', false, 0, '');
  }
}

class UMLMultiplicityRangeShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFontColor('#1a1f36');
    c.setFontSize(11);
    c.text(cx, cy + 4, 0, 0, 'n..m', 'center', 'middle', false, '', 'hidden', false, 0, '');
  }
}

class UMLMultiplicityNShapeCanvas extends Shape {
  paintBackground(c: AbstractCanvas2D, x: number, y: number, w: number, h: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    c.setFontColor('#1a1f36');
    c.setFontSize(12);
    c.text(cx, cy + 4, 0, 0, 'n', 'center', 'middle', false, '', 'hidden', false, 0, '');
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

  // ─── DFD Shapes ──────────────────────────────────────────────────────────
  'igraph.dfdProcess': DFDProcessShapeCanvas,
  'igraph.dfdDataFlow': DFDDataFlowShapeCanvas,
  'igraph.dfdDataStore': DFDDataStoreShapeCanvas,
  'igraph.dfdDataStoreGS': DFDDataStoreGSShapeCanvas,
  'igraph.dfdExternalEntity': DFDExternalEntityShapeCanvas,
  'igraph.dfdBidirectional': DFDBidirectionalShapeCanvas,
  'igraph.dfdBoundary': DFDBoundaryShapeCanvas,
  'igraph.dfdNote': DFDNoteShapeCanvas,
  'igraph.dfdOnPage': DFDOnPageShapeCanvas,
  'igraph.dfdOffPage': DFDOffPageShapeCanvas,

  // ─── Fishbone Shapes ────────────────────────────────────────────────────
  'igraph.fishboneSpine': FishboneSpineShapeCanvas,
  'igraph.fishboneHead': FishboneHeadShapeCanvas,
  'igraph.fishboneProblem': FishboneProblemShapeCanvas,
  'igraph.fishboneCauseTop': FishboneCauseTopShapeCanvas,
  'igraph.fishboneCauseBottom': FishboneCauseBottomShapeCanvas,
  'igraph.fishboneSubCauseTop': FishboneSubCauseTopShapeCanvas,
  'igraph.fishboneSubCauseBottom': FishboneSubCauseBottomShapeCanvas,
  'igraph.fishboneTertiary': FishboneTertiaryShapeCanvas,
  'igraph.fishboneArrow': FishboneArrowShapeCanvas,
  'igraph.fishboneDashedArrow': FishboneDashedArrowShapeCanvas,
  'igraph.fishboneCategory': FishboneCategoryShapeCanvas,
  'igraph.fishboneBubble': FishboneBubbleShapeCanvas,
  'igraph.fishboneNote': FishboneNoteShapeCanvas,

  // ─── Schematic Shapes ──────────────────────────────────────────────────
  'igraph.schematicBattery': SchematicBatteryShapeCanvas,
  'igraph.schematicAC': SchematicACShapeCanvas,
  'igraph.schematicGround': SchematicGroundShapeCanvas,
  'igraph.schematicResistor': SchematicResistorShapeCanvas,
  'igraph.schematicVariableResistor': SchematicVariableResistorShapeCanvas,
  'igraph.schematicCapacitor': SchematicCapacitorShapeCanvas,
  'igraph.schematicInductor': SchematicInductorShapeCanvas,
  'igraph.schematicDiode': SchematicDiodeShapeCanvas,
  'igraph.schematicLED': SchematicLEDShapeCanvas,
  'igraph.schematicNPN': SchematicNPNShapeCanvas,
  'igraph.schematicSwitch': SchematicSwitchShapeCanvas,
  'igraph.schematicFuse': SchematicFuseShapeCanvas,
  'igraph.schematicConnection': SchematicConnectionShapeCanvas,
  'igraph.schematicNoConnection': SchematicNoConnectionShapeCanvas,

  // ─── Use Case Shapes ──────────────────────────────────────────────────
  'igraph.umlInclude': UMLIncludeShapeCanvas,
  'igraph.umlExtend': UMLExtendShapeCanvas,
  'igraph.ucActor': UCActorShapeCanvas,
  'igraph.umlUseCase': UMLUseCaseShapeCanvas,
  'igraph.umlSystemBoundary': UMLSystemBoundaryShapeCanvas,
  'igraph.umlAssociation': UMLAssociationShapeCanvas,
  'igraph.umlGeneralization': UMLGeneralizationShapeCanvas,
  'igraph.umlNote': UMLNoteShapeCanvas,
  'igraph.umlNoteConnector': UMLNoteConnectorShapeCanvas,
  'igraph.umlIncludeLabel': UMLIncludeLabelShapeCanvas,
  'igraph.umlExtendLabel': UMLExtendLabelShapeCanvas,

  // ─── Activity Shapes ──────────────────────────────────────────────────
  'igraph.umlInitialNode': UMLInitialNodeShapeCanvas,
  'igraph.umlActivity': UMLActivityShapeCanvas,
  'igraph.umlDecision': UMLDecisionShapeCanvas,
  'igraph.umlMerge': UMLMergeShapeCanvas,
  'igraph.umlFork': UMLForkShapeCanvas,
  'igraph.umlControlFlow': UMLControlFlowShapeCanvas,
  'igraph.umlObjectFlow': UMLObjectFlowShapeCanvas,
  'igraph.umlSwimlane': UMLSwimlaneShapeCanvas,
  'igraph.umlActivityFinal': UMLActivityFinalShapeCanvas,
  'igraph.umlFlowFinal': UMLFlowFinalShapeCanvas,
  'igraph.umlConstraint': UMLConstraintShapeCanvas,

  // ─── Sequence Shapes ──────────────────────────────────────────────────
  'igraph.umlLifeline': UMLLifelineShapeCanvas,
  'igraph.umlActivation': UMLActivationShapeCanvas,
  'igraph.umlDestroy': UMLDestroyShapeCanvas,
  'igraph.umlSyncMsg': UMLSyncMsgShapeCanvas,
  'igraph.umlAsyncMsg': UMLAsyncMsgShapeCanvas,
  'igraph.umlReturnMsg': UMLReturnMsgShapeCanvas,
  'igraph.umlAlt': UMLAltShapeCanvas,
  'igraph.umlOpt': UMLOptShapeCanvas,
  'igraph.umlLoop': UMLLoopShapeCanvas,
  'igraph.umlPar': UMLParShapeCanvas,
  'igraph.umlBreak': UMLBreakShapeCanvas,

  // ─── Class Shapes ──────────────────────────────────────────────────────
  'igraph.umlComposition': UMLCompositionShapeCanvas,
  'igraph.umlClass': UMLClassShapeCanvas,
  'igraph.umlDirectedAssociation': UMLDirectedAssociationShapeCanvas,
  'igraph.umlAggregation': UMLAggregationShapeCanvas,
  'igraph.umlDependency': UMLDependencyShapeCanvas,
  'igraph.umlMultiplicity1': UMLMultiplicity1ShapeCanvas,
  'igraph.umlMultiplicity01': UMLMultiplicity01ShapeCanvas,
  'igraph.umlMultiplicityMany': UMLMultiplicityManyShapeCanvas,
  'igraph.umlMultiplicity1Many': UMLMultiplicity1ManyShapeCanvas,
  'igraph.umlMultiplicityRange': UMLMultiplicityRangeShapeCanvas,
  'igraph.umlMultiplicityN': UMLMultiplicityNShapeCanvas,

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
  'igraph.pentagon': PentagonShapeCanvas,
  'igraph.trapezoid': TrapezoidShapeCanvas,
  'igraph.dshape': DShapeCanvas,
  'igraph.hexagon': HexagonShapeCanvas,
  'igraph.display': DisplayShapeCanvas,
  'igraph.annotation': AnnotationShapeCanvas,
  'igraph.initialNode': InitialNodeSolid,
  'igraph.finalNode': FinalNodeShape,
  'igraph.forkJoin': ForkJoinShape,
  'igraph.lifeline': LifelineShape,
  'igraph.activation': ActivationShape,
  'igraph.classBox': ClassBoxShape,
  'igraph.interface': UMLInterfaceShapeCanvas,
  'igraph.abstractClass': AbstractClassShape,
  'igraph.entity': EntityShape,
  'igraph.weakEntity': WeakEntityShape,
  'igraph.attribute': ERDAttributeShapeCanvas,
  'igraph.primaryKey': ERDAttributeShapeCanvas,
  'igraph.derivedAttr': ERDDerivedAttributeShapeCanvas,
  'igraph.compositeAttr': ERDAttributeShapeCanvas,
  'igraph.multiAttr': ERDMultivaluedAttributeShapeCanvas,
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
  'igraph.arrow': ArrowShapeCanvas,
  'igraph.arrowDown': ArrowDownShapeCanvas,
  'igraph.arrowRight': ArrowRightShapeCanvas,
  'igraph.filledArrow': ArrowShapeCanvas,
  'igraph.openArrow': OpenArrowShapeCanvas,
  'igraph.dashedArrow': DashedArrowShapeCanvas,
  'igraph.dashedArrowBack': DashedArrowBackShapeCanvas,
  'igraph.triangleArrow': TriangleArrowShapeCanvas,
  'igraph.loopArrow': LoopArrowShapeCanvas,
  'igraph.createArrow': CreateArrowShapeCanvas,
  'igraph.destruction': DestructionShapeCanvas,
  'igraph.aggregation': AggregationShapeCanvas,
  'igraph.composition': CompositionShapeCanvas,
  'igraph.multiplicity': MultiplicityShapeCanvas,
  'igraph.arrowDiag': ArrowDiagShapeCanvas,
  'igraph.arrowSmall': ArrowSmallShapeCanvas,
  'igraph.resistor': SchematicResistorShapeCanvas,
  'igraph.capacitor': SchematicCapacitorShapeCanvas,
  'igraph.inductor': SchematicInductorShapeCanvas,
  'igraph.voltage': SchematicBatteryShapeCanvas,
  'igraph.ground': SchematicGroundShapeCanvas,
  'igraph.diode': SchematicDiodeShapeCanvas,
  'igraph.transistor': SchematicNPNShapeCanvas,
  'igraph.ic': SchematicICShapeCanvas,
  'igraph.opamp': SchematicOpAmpShapeCanvas,
  'igraph.switch': SchematicSwitchShapeCanvas,
  'igraph.fuse': SchematicFuseShapeCanvas,
  'igraph.transformer': SchematicTransformerShapeCanvas,
  'igraph.erdEntity': ERDEntityShapeCanvas,
  'igraph.erdWeakEntity': ERDWeakEntityShapeCanvas,
  'igraph.erdRelationship': ERDRelationshipShapeCanvas,
  'igraph.erdIdentifyingRelationship': ERDIdentifyingRelShapeCanvas,
  'igraph.erdAttribute': ERDAttributeShapeCanvas,
  'igraph.erdMultivaluedAttribute': ERDMultivaluedAttributeShapeCanvas,
  'igraph.erdDerivedAttribute': ERDDerivedAttributeShapeCanvas,
  'igraph.erdCardinality11': ERDCardinality11ShapeCanvas,
  'igraph.erdCardinality1N': ERDCardinality1NShapeCanvas,
  'igraph.erdCardinalityN1': ERDCardinalityN1ShapeCanvas,
  'igraph.erdCardinalityMN': ERDCardinalityMNShapeCanvas,
};

// ─── Public API ───────────────────────────────────────────────────────────────

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

  // ─── DFD ────────────────────────────────────────────────────────────────
  'dfd-process': 'igraph.dfdProcess',
  'dfd-data-flow': 'igraph.dfdDataFlow',
  'dfd-data-store': 'igraph.dfdDataStore',
  'dfd-data-store-gs': 'igraph.dfdDataStoreGS',
  'dfd-external-entity': 'igraph.dfdExternalEntity',
  'dfd-bidirectional': 'igraph.dfdBidirectional',
  'dfd-boundary': 'igraph.dfdBoundary',
  'dfd-note': 'igraph.dfdNote',
  'dfd-on-page': 'igraph.dfdOnPage',
  'dfd-off-page': 'igraph.dfdOffPage',

  // ─── ERD ────────────────────────────────────────────────────────────────
  'erd-entity': 'igraph.erdEntity',
  'erd-weak-entity': 'igraph.erdWeakEntity',
  'erd-relationship': 'igraph.erdRelationship',
  'erd-identifying-rel': 'igraph.erdIdentifyingRelationship',
  'erd-attribute': 'igraph.erdAttribute',
  'erd-multivalued-attr': 'igraph.erdMultivaluedAttribute',
  'erd-derived-attr': 'igraph.erdDerivedAttribute',
  'erd-cardinality-11': 'igraph.erdCardinality11',
  'erd-cardinality-1n': 'igraph.erdCardinality1N',
  'erd-cardinality-n1': 'igraph.erdCardinalityN1',
  'erd-cardinality-mn': 'igraph.erdCardinalityMN',
  'erd-connector': 'igraph.erdConnector',

  // ─── Fishbone ────────────────────────────────────────────────────────────
  'fishbone-spine': 'igraph.fishboneSpine',
  'fishbone-head': 'igraph.fishboneHead',
  'fishbone-problem': 'igraph.fishboneProblem',
  'fishbone-cause-top': 'igraph.fishboneCauseTop',
  'fishbone-cause-bottom': 'igraph.fishboneCauseBottom',
  'fishbone-sub-top': 'igraph.fishboneSubCauseTop',
  'fishbone-sub-bottom': 'igraph.fishboneSubCauseBottom',
  'fishbone-tertiary': 'igraph.fishboneTertiary',
  'fishbone-arrow': 'igraph.fishboneArrow',
  'fishbone-dashed-arrow': 'igraph.fishboneDashedArrow',
  'fishbone-category': 'igraph.fishboneCategory',
  'fishbone-bubble': 'igraph.fishboneBubble',
  'fishbone-note': 'igraph.fishboneNote',

  // ─── Schematic ──────────────────────────────────────────────────────────
  'schematic-battery': 'igraph.schematicBattery',
  'schematic-ac': 'igraph.schematicAC',
  'schematic-ground': 'igraph.schematicGround',
  'schematic-resistor': 'igraph.schematicResistor',
  'schematic-variable-resistor': 'igraph.schematicVariableResistor',
  'schematic-capacitor': 'igraph.schematicCapacitor',
  'schematic-inductor': 'igraph.schematicInductor',
  'schematic-diode': 'igraph.schematicDiode',
  'schematic-led': 'igraph.schematicLED',
  'schematic-npn': 'igraph.schematicNPN',
  'schematic-switch': 'igraph.schematicSwitch',
  'schematic-fuse': 'igraph.schematicFuse',
  'schematic-connection': 'igraph.schematicConnection',
  'schematic-no-connection': 'igraph.schematicNoConnection',

  // ─── Use Case ───────────────────────────────────────────────────────────
  'uc-actor': 'igraph.ucActor',
  'use-case': 'igraph.umlUseCase',
  'system-boundary': 'igraph.umlSystemBoundary',
  'uc-association': 'igraph.umlAssociation',
  'uc-include': 'igraph.umlInclude',
  'uc-extend': 'igraph.umlExtend',
  'uc-generalization': 'igraph.umlGeneralization',
  'uc-note': 'igraph.umlNote',
  'uc-note-connector': 'igraph.umlNoteConnector',
  'uc-include-label': 'igraph.umlIncludeLabel',
  'uc-extend-label': 'igraph.umlExtendLabel',

  // ─── Activity ───────────────────────────────────────────────────────────
  'act-initial-node': 'igraph.umlInitialNode',
  'act-activity': 'igraph.umlActivity',
  'act-decision': 'igraph.umlDecision',
  'act-merge': 'igraph.umlMerge',
  'act-fork': 'igraph.umlFork',
  'act-control-flow': 'igraph.umlControlFlow',
  'act-object-flow': 'igraph.umlObjectFlow',
  'act-swimlane': 'igraph.umlSwimlane',
  'act-final-node': 'igraph.umlActivityFinal',
  'act-flow-final': 'igraph.umlFlowFinal',
  'act-note': 'igraph.umlNote',
  'act-constraint': 'igraph.umlConstraint',

  // ─── Sequence ───────────────────────────────────────────────────────────
  'seq-actor': 'igraph.ucActor',
  'seq-lifeline': 'igraph.umlLifeline',
  'seq-activation': 'igraph.umlActivation',
  'seq-destroy': 'igraph.umlDestroy',
  'seq-sync-msg': 'igraph.umlSyncMsg',
  'seq-async-msg': 'igraph.umlAsyncMsg',
  'seq-return-msg': 'igraph.umlReturnMsg',
  'seq-alt': 'igraph.umlAlt',
  'seq-opt': 'igraph.umlOpt',
  'seq-loop': 'igraph.umlLoop',
  'seq-par': 'igraph.umlPar',
  'seq-break': 'igraph.umlBreak',
  'seq-note': 'igraph.umlNote',

  // ─── Class ──────────────────────────────────────────────────────────────
  'class-box': 'igraph.umlClass',
  'class-association': 'igraph.umlAssociation',
  'class-directed': 'igraph.umlDirectedAssociation',
  'class-aggregation': 'igraph.umlAggregation',
  'class-composition': 'igraph.umlComposition',
  'class-dependency': 'igraph.umlDependency',
  'class-generalization': 'igraph.umlGeneralization',
  'class-note': 'igraph.umlNote',
  'class-note-connector': 'igraph.umlNoteConnector',
  'class-multiplicity-1': 'igraph.umlMultiplicity1',
  'class-multiplicity-01': 'igraph.umlMultiplicity01',
  'class-multiplicity-many': 'igraph.umlMultiplicityMany',
  'class-multiplicity-1many': 'igraph.umlMultiplicity1Many',
  'class-multiplicity-range': 'igraph.umlMultiplicityRange',
  'class-multiplicity-n': 'igraph.umlMultiplicityN',
};