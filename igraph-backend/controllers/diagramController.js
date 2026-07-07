// igraph-backend/controllers/diagramController.js

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
      return res.status(400).json({
        success: false,
        message: 'Diagram name and XML content are required.',
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

    await db.collection(COLLECTION).doc(diagramId).set(diagramData);

    console.log(`✅ Diagram "${name}" saved for user ${userId}`);

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
    console.error('Save diagram error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save diagram. Please try again.',
    });
  }
};

/**
 * Get all saved diagrams for the current user
 */
const getSavedDiagrams = async (req, res) => {
  try {
    const userId = req.user.uid;

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

    res.status(200).json({
      success: true,
      data: diagrams,
    });
  } catch (error) {
    console.error('Get saved diagrams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load saved diagrams.',
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

    const doc = await db.collection(COLLECTION).doc(diagramId).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Diagram not found.',
      });
    }

    const data = doc.data();

    // Check if the diagram belongs to the current user
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
    console.error('Get diagram error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load diagram.',
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

    const doc = await db.collection(COLLECTION).doc(diagramId).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Diagram not found.',
      });
    }

    const data = doc.data();

    // Check if the diagram belongs to the current user
    if (data.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this diagram.',
      });
    }

    await db.collection(COLLECTION).doc(diagramId).delete();

    res.status(200).json({
      success: true,
      message: 'Diagram deleted successfully.',
    });
  } catch (error) {
    console.error('Delete diagram error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete diagram.',
    });
  }
};

module.exports = {
  saveDiagram,
  getSavedDiagrams,
  getDiagram,
  deleteDiagram,
};