const FACE_COLORS = ["#ffd6a5", "#caffbf", "#9bf6ff", "#bdb2ff", "#ffc6ff", "#fdffb6"];

export const faceColor = (i: number) => FACE_COLORS[i % FACE_COLORS.length];
