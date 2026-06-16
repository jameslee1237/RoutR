package com.routr.common.exception

import org.springframework.http.HttpStatus

sealed class AppException(message: String, val httpStatus: HttpStatus): RuntimeException(message) {
    class NotFound(resource: String, id: Any) : AppException("$resource '$id' not found", HttpStatus.NOT_FOUND)
    class Forbidden(message: String = "Access denied") : AppException(message, HttpStatus.FORBIDDEN)
    class Conflict(message: String) : AppException(message, HttpStatus.CONFLICT)
    class InvalidState(message: String) : AppException(message, HttpStatus.UNPROCESSABLE_ENTITY)
    class BadRequest(message: String) : AppException(message, HttpStatus.BAD_REQUEST)
}