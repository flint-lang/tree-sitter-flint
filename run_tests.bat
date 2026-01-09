@echo off
setlocal

set "TARGET_TEST="
set "UPDATE_SNAPSHOTS=0"

:PARSE_ARGS

IF "%~1"=="" GOTO EXECUTE

IF /I "%~1"=="-u" (
    set "UPDATE_SNAPSHOTS=1"
    SHIFT
    GOTO PARSE_ARGS
)

set "TARGET_TEST=%~1"
SHIFT
GOTO PARSE_ARGS

:EXECUTE
echo ---------------------------------------
echo Detected Test Configuration:
IF "%UPDATE_SNAPSHOTS%"=="1" ( echo Mode: UPDATE ) ELSE ( echo Mode: RUN )
IF DEFINED TARGET_TEST ( echo Target: %TARGET_TEST% ) ELSE ( echo Target: ALL TESTS )
echo ---------------------------------------

IF "%UPDATE_SNAPSHOTS%"=="1" (
    IF DEFINED TARGET_TEST (
        echo Updating expected result for specific test...
        call tree-sitter test -ur -i "%TARGET_TEST%"
    ) ELSE (
        echo Updating expected results for ALL tests...
        call tree-sitter test -ur
    )
) ELSE (
    IF DEFINED TARGET_TEST (
        echo Running specific test...
        call tree-sitter test -r -i "%TARGET_TEST%"
    ) ELSE (
        echo Running all tests...
        call tree-sitter test -r
    )
)