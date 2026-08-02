const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { getAccessLevel, canView, canEdit, canRename } = require('../utils/diagramAccess');

const COLLECTION = 'diagrams';

const saveDiagram = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id, name, xml, previewImage, type, pages, activePageId } = req.body;

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

    const now = new Date().toISOString();

    // Continuing/re-saving an existing diagram updates it in place instead
    // of creating a duplicate.
    if (id) {
      const existingDoc = await db.collection(COLLECTION).doc(id).get();

      if (!existingDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Diagram not found.',
        });
      }

      const existingData = existingDoc.data();
      const accessLevel = getAccessLevel(existingData, userId);

      if (!canEdit(accessLevel)) {
        console.log(`❌ User ${userId} does not have edit access to diagram ${id} (level: ${accessLevel})`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this diagram.',
        });
      }

      // Renaming is an owner/edit_share-level action (matches renameDiagram
      // below) — a plain 'edit' collaborator can save content changes here
      // but shouldn't be able to rename the diagram out from under everyone
      // else just because the title field rides along in the same save call.
      const allowRename = canRename(accessLevel);

      await db.collection(COLLECTION).doc(id).update({
        ...(allowRename ? { name: name.trim() } : {}),
        xml: xml,
        preview_image: previewImage || null,
        type: type || 'General',
        pages: pages || [],
        active_page_id: activePageId || null,
        updated_at: now,
      });

      console.log(`✅ Diagram "${name}" updated in place with ID: ${id}`);

      return res.status(200).json({
        success: true,
        message: 'Diagram saved successfully!',
        data: {
          diagram: {
            id,
            name: canRename ? name.trim() : existingData.name,
            type: type || 'General',
            created_at: existingData.created_at,
          },
        },
      });
    }

    const diagramId = uuidv4();

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

const getSavedDiagrams = async (req, res) => {
  try {
    const userId = req.user.uid;

    console.log(`📋 Fetching diagrams for user: ${userId}`);

    // Two separate queries, merged here, rather than one compound query —
    // Firestore can't OR across different fields (user_id vs an
    // array-contains on collaborator_ids) in a single query.
    const [ownedSnapshot, sharedSnapshot] = await Promise.all([
      db.collection(COLLECTION).where('user_id', '==', userId).get(),
      db.collection(COLLECTION).where('collaborator_ids', 'array-contains', userId).get(),
    ]);

    const diagrams = [];
    ownedSnapshot.forEach((doc) => {
      const data = doc.data();
      diagrams.push({
        id: data.diagram_id,
        name: data.name,
        type: data.type || 'General',
        previewImage: data.preview_image || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        isOwner: true,
        accessLevel: 'owner',
      });
    });
    sharedSnapshot.forEach((doc) => {
      const data = doc.data();
      const collaborator = (data.collaborators || []).find((c) => c.user_id === userId);
      diagrams.push({
        id: data.diagram_id,
        name: data.name,
        type: data.type || 'General',
        previewImage: data.preview_image || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        isOwner: false,
        accessLevel: collaborator?.permission || 'view',
      });
    });

    diagrams.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

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
    const accessLevel = getAccessLevel(data, userId);

    if (!canView(accessLevel)) {
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
        // Lets the frontend gate its own UI (read-only viewer for 'view',
        // hide rename/delete unless owner, etc.) without a second round trip.
        accessLevel,
        // So the "Request permission" banner can show "Request sent" instead
        // of the button again after a reload, rather than only for the rest
        // of this one session.
        hasPendingAccessRequest: (data.access_requests || []).some((r) => r.user_id === userId),
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

    // Owner or edit_share collaborator — matches saveDiagram's own rename
    // gate above (canRename), which is where this bug actually surfaced:
    // this endpoint used to check plain ownership only, so an edit_share
    // collaborator could rename a diagram from inside the editor (title
    // rides along with a content save) but got a 403 doing the exact same
    // thing from the Saved Diagrams screen's Rename button, which always
    // calls this endpoint directly.
    const accessLevel = getAccessLevel(data, userId);
    if (!canRename(accessLevel)) {
      console.log(`❌ User ${userId} does not have rename access to diagram ${diagramId} (level: ${accessLevel})`);
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