# spirited

A small library for animating numerical arrays.

### Installation

```shell
npm install spirited
```

### Examples

``` shell
git clone https://github.com/autopilothq/spirited.git
cd spirited
npm run build
npm start
```

Open up http://127.0.0.1:8080 or http://10.1.1.213:8080 in the browser.


### Usage

#### Creating and playing animations

``` javascript
import {animate, playback} from 'spirited';

// Create an animation with a initial tween that has the values [1, 2]
// and a duration of 200ms
const animation = animate([1, 2], 200, {loop: true, easing: 'linear'})
                     .tween([2, 4], 200)
                     .tween([3, 8, 400]);

const domElement = ...;

player = playback(animation)
          .onTick((left, top) => {
            domElement.style.left = left + 'px';
            domElement.style.top = top + 'px';
          })
          .start(performance.now());

// Play the animation for 4sec and then stop
setTimeout(() => {
  player.stop();
}, 4000);
```

#### Combining animations

``` javascript
import {animate, combine} from 'spirited';

const anim1 = animate([0, 0], 400).tween([10, 0], 400);
const anim2 = animate([0, 0], 400).tween([0, 10], 400);
const group = combine(anim1, anim2);
const groupPlayer = group();

// All the values from the animations are combined into a single set
groupPlayer.onTick((first, second) => {
             console.log('Tick', first, second);
           })
           .start(performance.now());
```

#### Composing animations

``` javascript
import {animate, compose} from 'spirited';

const positionAnim = animate([0, 0], 400).tween([10, 0], 400);
const radiusAnim = animate([50], 400).tween([100], 400);
const group = compose(positionAnim, radiusAnim);
const groupPlayer = group();

// The values for each animation are passed as separate arguments
groupPlayer.onTick(({top, left}, radius) => {
             console.log('Tick', top, left, radius);
           })
           .start(performance.now());
```

### Issues

* the docs task currently fails (`npm run doc`) as jsdoc doesn't support the newest, most shiny ES 6/7 syntax
