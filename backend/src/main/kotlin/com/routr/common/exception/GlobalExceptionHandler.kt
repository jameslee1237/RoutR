package com.routr.common.exception

import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.http.ProblemDetail
import java.net.URI
import org.springframework.http.HttpStatus
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler

@RestControllerAdvice
class GlobalExceptionHandler: ResponseEntityExceptionHandler() {
    @ExceptionHandler(AppException::class)
    fun handleAppException(ex: AppException, request: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatusAndDetail(ex.httpStatus, ex.message ?: "")
        problem.type = URI("https://routr.app/errors/${ex.httpStatus.value()}")
        problem.instance = URI(request.requestURI)
        problem.setProperty("errorCode", ex::class.simpleName)
        return ResponseEntity.status(ex.httpStatus).body(problem)
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception, request: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR)
        problem.detail = "An unexpected error occurred"
        problem.instance = URI(request.requestURI)
        return ResponseEntity.status(500).body(problem)
    }
}