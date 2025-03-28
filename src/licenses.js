import fs from 'fs';
import path from 'path';

/**
 * @param {string} user
 * @param {number} year
 * @returns {string}
 */
function mit(user, year) {
  return `Copyright ${year} ${user}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
`;
}

/**
 * @param {string} user
 * @param {number} year
 * @returns {string}
 */
function apache(user, year) {
  return `Copyright ${year} ${user}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
`;
}

/**
 * @param {string} user
 * @param {number} year
 * @returns {string}
 */
function gpl3(user, year) {
  return `Copyright (C) ${year} ${user}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
`;
}

/**
 * @param {string} user
 * @param {number} year
 * @returns {string}
 */
function isc(user, year) {
  return `Copyright (c) ${year}, ${user}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
`;
}

/**
 * @enum {string}
 */
export const LicenseType = {
  MIT: 'MIT',
  ISC: 'ISC',
  'APACHE-2.0': 'APACHE-2.0',
  'GPL-3.0': 'GPL-3.0',
};

/**
 * @type {Object<LicenseType, function(string, number):string>}
 */
const LicenseTypeFunctions = {
  [LicenseType.MIT]: mit,
  [LicenseType['GPL-3.0']]: gpl3,
  [LicenseType.ISC]: isc,
  [LicenseType['APACHE-2.0']]: apache,
};

/**
 * @param {string} user
 * @param {LicenseType} type
 * @param {string} pluginPath
 * @returns {Promise<void>}
 */
export function writeLicense(user, type, pluginPath) {
  const year = new Date().getFullYear();
  const text = LicenseTypeFunctions[type](user, year);

  return fs.promises.writeFile(path.join(pluginPath, 'LICENSE.md'), text);
}
