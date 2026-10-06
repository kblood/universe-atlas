#!/bin/sh
A=C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/bk/arm.mjs
for spec in "$@"; do
  pre=${spec%%:*}; rest=${spec#*:}; arm=${rest%%:*}; envs=${rest#*:}; [ "$envs" = "$rest" ] && envs=""
  env PRE=$pre $envs node $A $arm ${W:-Maithea} ${R:-7} | grep -v "pre acc"
done
