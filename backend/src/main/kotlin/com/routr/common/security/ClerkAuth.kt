package com.routr.common.security

import org.springframework.security.core.Authentication

fun Authentication.clerkUserId(): String = name