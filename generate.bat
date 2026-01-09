@echo off

echo Generating parser...
call tree-sitter generate

echo Building for WebAssembly...
call tree-sitter build --wasm

echo Done!