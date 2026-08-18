const admin = require('firebase-admin');
const db = admin.firestore();

class NoteModel {
  static collection() {
    return db.collection('notes');
  }

  static async createNote(userId, data) {
    const noteRef = this.collection().doc();
    const note = {
      id: noteRef.id,
      userId,
      text: data.text,
      diagramId: data.diagramId,
      diagramTitle: data.diagramTitle,
      diagramType: data.diagramType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await noteRef.set(note);
    return note;
  }

  static async getNotesByUser(userId) {
    const snapshot = await this.collection()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    const notes = [];
    snapshot.forEach((doc) => notes.push({ id: doc.id, ...doc.data() }));
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