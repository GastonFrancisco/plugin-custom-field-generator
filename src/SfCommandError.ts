/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SfError, StructuredMessage } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { computeErrorCode } from './errorHandling.js';
import { removeEmpty } from './util.js';

// These types are 90% the same as SfErrorOptions (but they aren't exported to extend)
type ErrorDataProperties = AnyJson;
export type SfCommandErrorOptions<T extends ErrorDataProperties = ErrorDataProperties> = {
  message: string;
  exitCode: number;
  code: string;
  name?: string;
  commandName: string;
  data?: T;
  cause?: unknown;
  context?: string;
  actions?: string[];
  result?: unknown;
  warnings?: Array<StructuredMessage | string>;
};

type SfCommandErrorJson = {
  name: string;
  message: string;
  exitCode: number;
  commandName: string;
  context: string;
  code: string;
  status: string;
  stack: string;
  actions?: string;
  data?: ErrorDataProperties;
  cause?: string;
  warnings?: Array<StructuredMessage | string>;
  result?: unknown;
};

export class SfCommandError extends SfError {
  public status: number;
  public commandName: string;
  public warnings?: Array<StructuredMessage | string>;
  public result?: unknown;
  public skipOclifErrorHandling: boolean;
  public oclif: { exit: number };

  /**
   * SfCommandError is meant to wrap errors from `SfCommand.catch()` for a common
   * error format to be logged, sent to telemetry, and re-thrown. Do not create
   * instances from the constructor.  Call the static method, `SfCommandError.from()`
   * and use the returned `SfCommandError`.
   */
  private constructor(input: SfCommandErrorOptions) {
    super(input.message, input.name, input.actions, input.exitCode, input.cause);
    this.data = input.data;
    this.status = input.exitCode;
    this.warnings = input.warnings;
    this.skipOclifErrorHandling = true;
    this.commandName = input.commandName;
    this.code = input.code;
    this.result = input.result;
    this.oclif = { exit: input.exitCode };
    this.context = input.context ?? input.commandName;
  }

  public static from(
    err: Error | SfError | SfCommandError,
    commandName: string,
    warnings?: Array<StructuredMessage | string>
  ): SfCommandError {
    // SfError.wrap() does most of what we want so start with that.
    const sfError = SfError.wrap(err);
    const exitCode = computeErrorCode(sfError);
    sfError.code = 'code' in err ? err.code : exitCode.toString(10);
    return new this({
      message: sfError.message,
      name: err.name ?? 'Error',
      actions: 'actions' in err ? err.actions : undefined,
      exitCode,
      code: sfError.code,
      cause: sfError.cause,
      commandName: 'commandName' in err ? err.commandName : commandName,
      data: 'data' in err ? err.data : undefined,
      result: 'result' in err ? err.result : undefined,
      context: 'context' in err ? err.context : commandName,
      warnings,
    });
  }

  public toJson(): SfCommandErrorJson {
    return {
      ...removeEmpty({
        // toObject() returns name, message, exitCode, actions, context, data
        ...this.toObject(),
        stack: this.stack,
        cause: this.cause,
        warnings: this.warnings,
        code: this.code,
        status: this.status,
        commandName: this.commandName,
        result: this.result,
      }),
    } as SfCommandErrorJson;
  }
}
