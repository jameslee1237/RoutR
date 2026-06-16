package com.routr

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class RoutrApplication

fun main(args: Array<String>) {
	runApplication<RoutrApplication>(*args)
}
