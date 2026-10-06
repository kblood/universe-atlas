import {waterWorlds,measureError} from '../../../tests/helpers/mountain-coarse-field.mjs';
for(const body of waterWorlds())console.log(JSON.stringify({world:body.name,...measureError(body)}));
