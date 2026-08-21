@rem
@rem Copyright 2015 the original author or authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem you may not use this file except in compliance with the License.
@rem You may obtain a copy of the License at
@rem
@rem      https://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, embodiment or
@rem fitness for a particular purpose.
@rem

@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%..

if defined JAVA_HOME goto findJavaFromJavaHome

set WAS_JAVA_EXEC=java
where %WAS_JAVA_EXEC% >nul 2>nul
if %ERRORLEVEL% equ 0 goto execute

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set WAS_JAVA_EXEC=%JAVA_HOME%/bin/java.exe

:execute
set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

"%WAS_JAVA_EXEC%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
