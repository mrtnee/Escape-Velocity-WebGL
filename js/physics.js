function boxesCollide(box1, box2) {
    return (box1.topLeft[0] <= box2.bottomRight[0] && box1.bottomRight[0] >= box2.topLeft[0]) &&
    (box1.topLeft[1] <= box2.bottomRight[1] && box1.bottomRight[1] >= box2.topLeft[1]) &&
    (box1.topLeft[2] <= box2.bottomRight[2] && box1.bottomRight[2] >= box2.topLeft[2]);
}

export { boxesCollide };