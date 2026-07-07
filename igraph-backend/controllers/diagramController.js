// igraph-backend/controllers/diagramController.js
// ✅ FULLY FIXED: Delete and Rename working

const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'diagrams';

/**
 * Save a new diagram for the current user
 */
const saveDiagram = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, xml, previewImage, type, pages, activePageId } = req.body;

    if (!name || !xml) {
      console.log('❌ Missing required fields:', { name: !!name, xml: !!xml });
      return res.status(400).json({
        success: false,
        message: 'Diagram name and XML content are required.',
      });
    }

    if (xml.trim().length === 0 || xml === '<mxGraphModel/>' || xml === '<root/>') {
      return res.status(400).json({
        success: false,
        message: 'Diagram content is empty. Please add shapes to your diagram.',
      });
    }

    const diagramId = uuidv4();
    const now = new Date().toISOString();

    const diagramData = {
      diagram_id: diagramId,
      user_id: userId,
      name: name.trim(),
      xml: xml,
      preview_image: previewImage || null,
      type: type || 'General',
      pages: pages || [],
      active_page_id: activePageId || null,
      created_at: now,
      updated_at: now,
    };

    console.log(`📝 Saving diagram for user ${userId}:`, { 
      name: name.trim(), 
      type: type || 'General',
      xmlLength: xml.length,
      hasPreview: !!previewImage
    });

    await db.collection(COLLECTION).doc(diagramId).set(diagramData);

    console.log(`✅ Diagram "${name}" saved successfully with ID: ${diagramId}`);

    res.status(201).json({
      success: true,
      message: 'Diagram saved successfully!',
      data: {
        diagram: {
          id: diagramId,
          name: name.trim(),
          type: type || 'General',
          created_at: now,
        },
      },
    });
  } catch (error) {
    console.error('❌ Save diagram error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save diagram. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all saved diagrams for the current user
 */
const getSavedDiagrams = async (req, res) => {
  try {
    const userId = req.user.uid;

    console.log(`📋 Fetching diagrams for user: ${userId}`);

    const snapshot = await db.collection(COLLECTION)
      .where('user_id', '==', userId)
      .orderBy('updated_at', 'desc')
      .get();

    const diagrams = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      diagrams.push({
        id: data.diagram_id,
        name: data.name,
        type: data.type || 'General',
        previewImage: data.preview_image || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
    });

    console.log(`✅ Found ${diagrams.length} diagrams for user ${userId}`);

    res.status(200).json({
      success: true,
      data: diagrams,
    });
  } catch (error) {
    console.error('❌ Get saved diagrams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load saved diagrams.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get a specific diagram by ID
 */
const getDiagram = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;

    console.log(`📋 Fetching diagram ${diagramId} for user ${userId}`);

    const doc = await db.collection(COLLECTION).doc(diagramId).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Diagram not found.',
      });
    }

    const data = doc.data();

    if (data.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this diagram.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: data.diagram_id,
        name: data.name,
        xml: data.xml,
        previewImage: data.preview_image || null,
        type: data.type || 'General',
        pages: data.pages || [],
        activePageId: data.active_page_id || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    });
  } catch (error) {
    console.error('❌ Get diagram error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load diagram.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * ✅ Rename a diagram
 */
const renameDiagram = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;
    const { name } = req.body;

    console.log(`📝 Rename request for diagram ${diagramId} by user ${userId}`);
    console.log(`📝 New name: "${name}"`);

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Diagram name is required.',
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Diagram name must be less than 100 characters.',
      });
    }

    const doc = await db.collection(COLLECTION).doc(diagramId).get();

    if (!doc.exists) {
      console.log(`❌ Diagram ${diagramId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Diagram not found.',
      });
    }

    const data = doc.data();

    // Check ownership
    if (data.user_id !== userId) {
      console.log(`❌ User ${userId} does not own diagram ${diagramId}`);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to rename this diagram.',
      });
    }

    const now = new Date().toISOString();

    await db.collection(COLLECTION).doc(diagramId).update({
      name: name.trim(),
      updated_at: now,
    });

    console.log(`✅ Diagram "${data.name}" renamed to "${name.trim()}" by user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Diagram renamed successfully!',
      data: {
        id: diagramId,
        name: name.trim(),
        updated_at: now,
      },
    });
  } catch (error) {
    console.error('❌ Rename diagram error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rename diagram. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete a diagram
 */
const deleteDiagram = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;

    console.log(`🗑️ Delete request for diagram ${diagramId} by user ${userId}`);

    const doc = await db.collection(COLLECTION).doc(diagramId).get();

    if (!doc.exists) {
      console.log(`❌ Diagram ${diagramId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Diagram not found.',
      });
    }

    const data = doc.data();

    if (data.user_id !== userId) {
      console.log(`❌ User ${userId} does not own diagram ${diagramId}`);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this diagram.',
      });
    }

    await db.collection(COLLECTION).doc(diagramId).delete();

    console.log(`🗑️ Diagram "${data.name}" deleted by user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Diagram deleted successfully.',
    });
  } catch (error) {
    console.error('❌ Delete diagram error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete diagram.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  saveDiagram,
  getSavedDiagrams,
  getDiagram,
  renameDiagram,
  deleteDiagram,
};