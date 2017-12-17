// @flow

import Converter from "./Converter.js"
import Updater from "./Updater.js"

import type {
  Entity, Props, Sprite, EntityObject, MCoords, RCoords, MoveOpts
} from "./types.js"

export class Collider {
  game: any
  gameObject: any
  scale: number
  entities: Entity[]

  constructor ({ game, gameObject, scale }: Props) {
    Object.assign(this, {
      game,
      gameObject,
      scale,
      entities: [],
    })
  }

  update() {
    const updater = new Updater(this)
    updater.update()
  }

  addEntity (
    { sprite, object }: { sprite: Sprite, object: EntityObject }) {
    this.entities.push({
      sprite,
      object,
      move: [],
      personalMatrix: this.compilePersonalMatrix(sprite)
    })
  }

  moveEntity (
    object: EntityObject,
    target: RCoords,
    { callback = () => {}, follow = false, reset = true }: MoveOpts  = {}
  ) {
    const entity = this.entities.find(x => x.object === object)
    if (!entity && target) throw new Error(`object not registered (${object})`)
    if (!entity) return

    if (reset) entity.move = []
    if (target) entity.move.push({ target, callback, follow })
  }

  moveToFactory () {
    const collider = this
    // Use old syntax to explicitly allow context changing
    return function moveTo (target: RCoords,  { callback, follow, reset }: MoveOpts = {}) {
      collider.moveEntity(this, target, { callback, follow, reset })
    }
  }

  compilePersonalMatrix (sprite: Sprite): MCoords[] {
    const converter = new Converter(this)

    const [centerX, centerY] = converter.rCoordsToMCoords(sprite.body.center);
    const [startX, startY] = converter.rCoordsToMCoords(sprite.body);
    const [endX, endY] = converter.rCoordsToMCoords({
      x: sprite.body.x+sprite.body.width,
      y: sprite.body.y+sprite.body.height
    });

    const { height, width, x, y, center} = sprite.body

    let result = [];
    for (let x=startX;x<=endX; x++) for (let y=startY; y<=endY; y++) {
        result.push([x - centerX, y - centerY])
    }
    return result;
  }

  invokeRawMoving (object: EntityObject, target: RCoords): void {
    object.setVelocity(target)
  }
}

export default Collider
