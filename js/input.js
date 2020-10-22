class KeyboardController {

    constructor(element) {
        this.element = element;
        this.keys = {};
        this.initializeListeners();
    }

    initializeListeners() {
        // Bind keylisteners to current element
        this.element.addEventListener('keydown', this.keydownHandler.bind(this));
        this.element.addEventListener('keyup', this.keyupHandler.bind(this));
    }

    isKeyPressed(keyCode) {
        return this.keys.hasOwnProperty(keyCode) && this.keys[keyCode];
    }

    keydownHandler(event) {
        this.keys[event.code] = true;
    }

    keyupHandler(event) {
        this.keys[event.code] = false;
    }

}

class MouseController {

    constructor(element) {
        this.element = element;
        this.initializeListeners();

        // Vector [azimuthal angle, polar angle] elements of [0, 2 * PI] x [-PI, PI]
        this.rotation = [0, 0];

        // Mouse sensitivity
        this.mouseSensitivity = 0.002;
    }

    mouseDirection() {
        // Return a unit vector pointing in current mouse direction
        return glMatrix.vec3.fromValues(-Math.sin(this.rotation[0]), Math.sin(this.rotation[1]), -Math.cos(this.rotation[0]));
    }

    initializeListeners() {
        // Bind pointer lock change listener
        this.pointerlockchangeHandler = this.pointerlockchangeHandler.bind(this);
        this.mousemoveHandler = this.mousemoveHandler.bind(this);

        document.addEventListener('pointerlockchange', this.pointerlockchangeHandler);
        
        // If user clicks on our element, we request pointer lock
        this.element.addEventListener('mouseup', function(event) {
            this.element.requestPointerLock();
        }.bind(this));
    }

    pointerlockchangeHandler() {
        if (document.pointerLockElement === this.element) {
            this.element.addEventListener('mousemove', this.mousemoveHandler);
        } else {
            this.element.removeEventListener('mousemove', this.mousemoveHandler);
        }
    }

    mousemoveHandler(e) {
        const twopi = Math.PI * 2;
        const halfpi = Math.PI / 2;

        const dx = e.movementX;
        const dy = e.movementY;

        // Calculate the polar and azimuthal angle
        this.rotation[0] -= dx * this.mouseSensitivity;
        this.rotation[1] -= dy * this.mouseSensitivity;

        // Constrain the polar angle between - PI and PI
        if (this.rotation[1] > halfpi)
            this.rotation[1] = halfpi;
        if (this.rotation[1] < -halfpi)
            this.rotation[1] = -halfpi;

        // Constrain the azimuthal angle between 0 and 2 * PI
        this.rotation[0] = ((this.rotation[0] % twopi) + twopi) % twopi;
    }

}

// This is how you create an enum in js
const Action = Object.freeze({
    "FORWARD": 1,
    "RIGHT": 2,
    "BACKWARD": 3,
    "LEFT": 4,
    "ACCELERATE": 5,
    "SHOOT": 6
});

// Create two different keyboard remappers
let leftKeyboardRemapper = {};
leftKeyboardRemapper[Action.FORWARD] = 'KeyW';
leftKeyboardRemapper[Action.RIGHT] = 'KeyD';
leftKeyboardRemapper[Action.BACKWARD] = 'KeyS';
leftKeyboardRemapper[Action.LEFT] = 'KeyA';
leftKeyboardRemapper[Action.ACCELERATE] = 'ShiftLeft';
leftKeyboardRemapper[Action.SHOOT] = 'KeyC';

let rightKeyboardRemapper = {};
rightKeyboardRemapper[Action.FORWARD] = 'KeyI';
rightKeyboardRemapper[Action.RIGHT] = 'KeyL';
rightKeyboardRemapper[Action.BACKWARD] = 'KeyK';
rightKeyboardRemapper[Action.LEFT] = 'KeyJ';
rightKeyboardRemapper[Action.ACCELERATE] = 'Slash';
rightKeyboardRemapper[Action.SHOOT] = 'Space';

export { KeyboardController, MouseController, Action, leftKeyboardRemapper, rightKeyboardRemapper };