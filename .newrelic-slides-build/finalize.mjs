import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.cwd();
const skill='C:/Users/LENOVO/.codex/plugins/cache/openai-primary-runtime/presentations/26.1015.12040/skills/presentations';
process.env.RUNTIME_NODE_MODULES='C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({workspaceDir:root,candidatePath:path.join(root,'.newrelic-slides-build/candidate.pptx'),finalPath:path.join(root,'entregables/Stock-Quest_New-Relic_Baja-Escala.pptx'),pythonExecutable:'C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','2','--require-native-table-slide','7','--require-native-table-slide','9'],requiredNativeTableOwnerSlides:[2,7,9],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:['Arial','Consolas']},verifyArtifactToolImport:true,receiptPath:path.join(root,'.newrelic-slides-build/validation-revised.json')});
console.log(JSON.stringify(result));
