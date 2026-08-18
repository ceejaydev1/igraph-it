const admin = require('firebase-admin');
const db = admin.firestore();

class NoteModel {
  static collection() {
    return db.collection('notes');
  }

  static async createNote(userId, data) {
    const noteRef = this.collection().doc();
    const createdAt = admin.firestore.FieldValue.serverTimestamp();
    const note = {
      id: noteRef.id,
      userId,
      text: data.text,
      diagramId: data.diagramId,
      diagramTitle: data.diagramTitle,
      diagramType: data.diagramType,
      createdAt,
    };
    await noteRef.set(note);
    // Re-read the doc so createdAt comes back as a real Firestore Timestamp
    // (not the serverTimestamp sentinel), which the frontend can display.
    const saved = await noteRef.get();
    return saved.exists ? { id: saved.id, ...saved.data() } : note;
  }

  static async getNotesByUser(userId) {
    const snapshot = await this.collection()
      .where('userId', '==', userId)
      .get();
    const notes = [];
    snapshot.forEach((doc) => notes.push({ id: doc.id, ...doc.data() }));
    // Sorting in JS avoids requiring a Firestore composite index (where +
    // orderBy on different fields needs one), which silently 500s the query
    // otherwise — and keeps the "newest first" ordering getNotes relies on.
    notes.sort((a, b) => {
      const aTime = a.createdAt && typeof a.createdAt.toMillis === 'function'
        ? a.createdAt.toMillis()
        : new Date(a.createdAt || 0).getTime();
      const bTime = b.createdAt && typeof b.createdAt.toMillis === 'function'
        ? b.createdAt.toMillis()
        : new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
    return notes;
  }

  static async deleteNote(noteId, userId) {
    const noteRef = this.collection().doc(noteId);
    const doc = await noteRef.get();
    if (!doc.exists) throw new Error('Note not found');
    if (doc.data().userId !== userId) throw new Error('Unauthorized');
    await noteRef.delete();
    return { success: true };
  }
}

module.exports = NoteModel;