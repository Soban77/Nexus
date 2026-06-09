export const rooms = new Map();

export const getParticipants = (roomId) => {
  return rooms.get(roomId) || [];
};

export const addParticipant = (roomId, participant) => {
  const participants = getParticipants(roomId).filter((p) => p.socketId !== participant.socketId);
  participants.push(participant);
  rooms.set(roomId, participants);
  return participants;
};

export const removeParticipant = (roomId, socketId) => {
  const participants = getParticipants(roomId).filter((p) => p.socketId !== socketId);
  if (participants.length > 0) {
    rooms.set(roomId, participants);
    return participants;
  }

  rooms.delete(roomId);
  return [];
};

export const removeParticipantBySocket = (socketId) => {
  const removedRooms = [];

  for (const [roomId, participants] of rooms.entries()) {
    const filtered = participants.filter((p) => p.socketId !== socketId);
    if (filtered.length !== participants.length) {
      if (filtered.length > 0) {
        rooms.set(roomId, filtered);
      } else {
        rooms.delete(roomId);
      }
      removedRooms.push(roomId);
    }
  }

  return removedRooms;
};

export const updateParticipantMedia = (roomId, socketId, mediaState) => {
  const participants = getParticipants(roomId);
  const index = participants.findIndex((p) => p.socketId === socketId);

  if (index === -1) {
    return null;
  }

  participants[index] = {
    ...participants[index],
    ...mediaState
  };
  rooms.set(roomId, participants);
  return participants[index];
};

export const clearRoom = (roomId) => {
  rooms.delete(roomId);
};
