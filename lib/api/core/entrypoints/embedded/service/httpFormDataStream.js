/*
 * Kuzzle, a backend software, self-hostable and ready to use
 * to power modern apps
 *
 * Copyright 2015-2018 Kuzzle
 * mailto: support AT kuzzle.io
 * website: http://kuzzle.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const
  SizeLimitError = require('kuzzle-common-objects').errors.SizeLimitError,
  Busboy = require('busboy');

/**
 * @class HttpFormDataStream
 * @param {Object} opts
 * @param {Object} payload
 * @param {http.IncomingMessage} request
 */
class HttpFormDataStream extends Busboy {
  constructor(opts, payload, request) {
    super(opts);
    payload.json = {};

    this.on('file', (fieldname, file, filename, encoding, mimetype) => {
      let fileBuffer = Buffer.from('');

      file.on('data', chunk => {
        fileBuffer = Buffer.concat(
          [fileBuffer, chunk],
          fileBuffer.length + chunk.length
        );
      });

      file.on('limit', () => {
        file
          .removeAllListeners()
          .resume();

        /*
         * Force Dicer parser to finish prematurely
         * without throwing an 'Unexpected end of multipart data' error :
         */
        this._parser.parser._finished = true;

        // Forward the error to the request stream
        request.emit(
          'error',
          new SizeLimitError('Maximum HTTP file size exceeded')
        );
      });

      file.on('end', () => {
        payload.json[fieldname] = {
          filename,
          encoding,
          mimetype,
          file: fileBuffer.toString('base64')
        };
      });

    });

    this.on('field', (fieldname, val) => {
      payload.json[fieldname] = val;
    });

    return this;
  }
}

module.exports = HttpFormDataStream;