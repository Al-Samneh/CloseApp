/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import 'react-native-get-random-values';
import { Buffer as BufferPolyfill } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = BufferPolyfill;
}

AppRegistry.registerComponent(appName, () => App);
