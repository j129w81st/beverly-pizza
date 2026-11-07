import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePrices} from '../prices.js';
test('Little Italy combines large base and meat topping',()=>assert.deepEqual(parsePrices('little-italy','<body>Large Pizza (16’’) - $18.05 Meat Toppings - $2.50/ea</body>'),{cheese:1805,topping:2055}));
test('Rantoul uses explicit large pepperoni price',()=>assert.deepEqual(parsePrices('rantoul','<body>Cheese Pizza $10.99 / $15.99 Pepperoni $15.99 / $20.99</body>'),{cheese:1599,topping:2099}));
test('changed menus fail closed',()=>assert.throws(()=>parsePrices('rantoul','<body>New menu coming soon</body>')));
