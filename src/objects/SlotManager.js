import Slot from './Slot';

export class SlotManager {
  constructor(target, directionObject, config) {
    this.slots = config.map(data => new Slot(target, directionObject, data))
  }

  update() {
    this.slots.filter(slot => slot.taken).forEach(slot => slot.update());
  }

  take (protester) {
    const slot = this.slots.find(x => !x.taken);
    if(!slot) return null
    slot.take(protester);
    return slot;
  }
}

export default SlotManager
