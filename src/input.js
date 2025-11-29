export default class Input {
  constructor(){
    this.isPressed = false; // one-time press consumed by game loop
    this.isHeld = false; // whether input is currently held

    this._setupListeners();
  }

  _setupListeners(){
    addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === ' '){
        if (!this.isHeld){
          this.isPressed = true;
        }
        this.isHeld = true;
        e.preventDefault();
      }
    });
    addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.key === ' '){
        this.isHeld = false;
        e.preventDefault();
      }
    });
    // mouse
    addEventListener('mousedown', (e) => {
      this.isPressed = true;
      this.isHeld = true;
    });
    addEventListener('mouseup', (e) => {
      this.isHeld = false;
    });
    // touch
    addEventListener('touchstart', (e) => {
      this.isPressed = true;
      this.isHeld = true;
      e.preventDefault();
    }, { passive: false });
    addEventListener('touchend', (e) => {
      this.isHeld = false;
      e.preventDefault();
    }, { passive: false });
  }

  consumePress(){
    this.isPressed = false;
  }
}