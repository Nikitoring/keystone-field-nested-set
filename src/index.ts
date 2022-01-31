import path from 'path';

import {
  BaseListTypeInfo,
  FieldTypeFunc,
  CommonFieldConfig,
  fieldType,
  AdminMetaRootVal,
  KeystoneContext,
  orderDirectionEnum
} from '@keystone-6/core/types';
import { graphql } from '@keystone-6/core';
import {
  isRoot,
  createRoot,
  isLeaf,
  fetchRoot,
  getWeight,
  getParentId,
  getchildrenCount,
  getPrevSibling,
  getNextSibling,
  getChildOf,
  getParentOf,
  insertLastChildOf,
  insertNextSiblingOf,
  insertPrevSiblingOf,
  moveAsChildOf
} from './utils';

const views = path.join(path.dirname(__dirname), 'views');

type SelectDisplayConfig = {
  ui?: {
    // Sets the relationship to display as a Select field
    displayMode?: 'select';
    /**
     * The path of the field to use from the related list for item labels in the select.
     * Defaults to the labelField configured on the related list.
     */
    labelField?: string;
  };
};

export type NestedSetData = {
  depth: number;
  left: number;
  right: number;
};

const nestedSetOutputFields = graphql.fields<NestedSetData>()({
  depth: graphql.field({ type: graphql.Int }),
  left: graphql.field({ type: graphql.nonNull(graphql.Int) }),
  right: graphql.field({ type: graphql.nonNull(graphql.Int) }),
  weight: graphql.field({
    type: graphql.Int,
    resolve(data, args, context, type) {
      return getWeight(data, context, type.path.prev?.key, type.path.prev?.typename);
    }
  }),
  isLeaf: graphql.field({
    type: graphql.nonNull(graphql.Boolean),
    resolve(data) {
      return isLeaf(data);
    }
  }),
  parentId: graphql.field({
    type: graphql.ID,
    resolve(data, args, type, context) {
      return getParentId(data, type, context.path.prev?.key, context.path.prev?.typename);
    }
  }),
  childrenCount: graphql.field({
    type: graphql.Int,
    resolve(data, args, context, type) {
      return getchildrenCount(data, context, type.path.prev?.key, type.path.prev?.typename);
    }
  })
});

const NestedSetOutput = graphql.interface<NestedSetData>()({
  name: 'NestedSetOutput',
  fields: nestedSetOutputFields,
  resolveType: () => {
    return 'NestedSetFieldOutput';
  }
});

const NestedSetFieldOutput = graphql.object<NestedSetData>()({
  name: 'NestedSetFieldOutput',
  interfaces: [NestedSetOutput],
  fields: nestedSetOutputFields
});

const NestedSetFieldInput = graphql.inputObject({
  name: 'NestedSetFieldInput',
  fields: {
    parentId: graphql.arg({ type: graphql.ID }),
    prevSiblingOf: graphql.arg({ type: graphql.ID }),
    nextSiblingOf: graphql.arg({ type: graphql.ID })
  }
});

const NestedSetFilterInput = graphql.inputObject({
  name: 'NestedSetFilterInput',
  fields: {
    prevSiblingId: graphql.arg({ type: graphql.ID }),
    nextSiblingId: graphql.arg({ type: graphql.ID }),
    parentOf: graphql.arg({ type: graphql.ID }),
    childOf: graphql.arg({ type: graphql.ID })
  }
});

type NestedSetFieldInputType = undefined | null | { parentId?: string; prevSiblingOf?: string; nextSiblingOf?: string };

type NestedSetFieldFilterType =
  | undefined
  | null
  | { parentId?: string; prevSiblingId?: string; nextSiblingId?: string; childOf?: string };

async function inputResolver(
  data: NestedSetFieldInputType,
  context: KeystoneContext,
  listKey: string,
  fieldKey: string
) {
  if (data === null || data === undefined) {
    return createRoot();
  }
  const { parentId, prevSiblingOf, nextSiblingOf } = data;
  if (parentId) {
    return await insertLastChildOf(parentId, context, listKey, fieldKey);
  }
  if (nextSiblingOf) {
    return await insertNextSiblingOf(nextSiblingOf, context, listKey, fieldKey);
  }
  if (prevSiblingOf) {
    return await insertPrevSiblingOf(prevSiblingOf, context, listKey, fieldKey);
  }
  return data;
}

async function updateInputResolver(
  data: NestedSetFieldInputType,
  context: KeystoneContext,
  listKey: string,
  fieldKey: string,
  current: { [key: string]: any }
) {
  // return;
  const { parentId, prevSiblingOf, nextSiblingOf } = data[fieldKey];
  console.log(parentId);
  // if (parentId) {
  //   return await moveAsChildOf(parentId, context, listKey, fieldKey, current);
  // }
  // if (nextSiblingOf) {
  //   return await insertNextSiblingOf(nextSiblingOf, context, listKey, fieldKey);
  // }
  // if (prevSiblingOf) {
  //   return await insertPrevSiblingOf(prevSiblingOf, context, listKey, fieldKey);
  // }
  // return data;
}

async function filterResolver(
  data: NestedSetFieldFilterType,
  context: KeystoneContext,
  listKey: string,
  fieldKey: string
) {
  const { prevSiblingId, nextSiblingId, childOf, parentOf } = data;
  let result = {};
  if (prevSiblingId) {
    const prevSiblingQuery = await getPrevSibling(prevSiblingId, context, listKey, fieldKey);
    result = { ...result, ...prevSiblingQuery };
  }
  if (nextSiblingId) {
    const nextSiblingQuery = await getNextSibling(nextSiblingId, context, listKey, fieldKey);
    result = { ...result, ...nextSiblingQuery };
  }
  if (childOf) {
    const childQuery = await getChildOf(childOf, context, listKey, fieldKey);
    result = { ...result, ...childQuery };
  }
  if (parentOf) {
    const parentQuery = await getParentOf(parentOf, context, listKey, fieldKey);
    result = { ...result, ...parentQuery };
  }
  return result;
}

export type NestedSetConfig<ListTypeInfo extends BaseListTypeInfo> =
  CommonFieldConfig<ListTypeInfo> & {} & SelectDisplayConfig;

export const nestedSet =
  <ListTypeInfo extends BaseListTypeInfo>({
    ...config
  }: NestedSetConfig<ListTypeInfo> = {}): FieldTypeFunc<ListTypeInfo> =>
  (meta) => {
    const listTypes = meta.lists[meta.listKey].types;
    const commonConfig = {
      ...config,
      isIndexed: 'unique',
      getAdminMeta: (
        adminMetaRoot: AdminMetaRootVal
      ): Parameters<typeof import('./views').controller>[0]['fieldMeta'] => {
        if (!listTypes) {
          throw new Error(`The ref [${listTypes}] on relationship [${meta.listKey}.${meta.fieldKey}] is invalid`);
        }
        return {
          listKey: meta.listKey,
          labelField: adminMetaRoot.listsByKey[meta.listKey].labelField
        };
      }
    };
    return fieldType({
      kind: 'multi',
      fields: {
        left: {
          kind: 'scalar',
          scalar: 'Int',
          mode: 'optional'
        },
        right: {
          kind: 'scalar',
          scalar: 'Int',
          mode: 'optional'
        },
        depth: {
          kind: 'scalar',
          scalar: 'Int',
          mode: 'optional'
        }
      }
    })({
      ...commonConfig,
      hooks: {
        // ...config.hooks,
        beforeOperation: ({ inputData, context, item, operation, resolvedData, listKey, fieldKey }) => {
          const currentItem = {
            id: item.id,
            [`${meta.fieldKey}_left`]: item[`${meta.fieldKey}_left`],
            [`${meta.fieldKey}_right`]: item[`${meta.fieldKey}_right`],
            [`${meta.fieldKey}_depth`]: item[`${meta.fieldKey}_depth`]
          };
          if (operation === 'update') {
            return updateInputResolver(inputData, context, listKey, fieldKey, currentItem);
          }
        }
      },
      input: {
        where: {
          arg: graphql.arg({ type: NestedSetFilterInput }),
          resolve(value, context) {
            return filterResolver(value, context, meta.listKey, meta.fieldKey);
          }
        },
        create: {
          arg: graphql.arg({ type: NestedSetFieldInput }),
          resolve(value, context) {
            if (value === undefined || value === null) {
              return createRoot();
            }
            return inputResolver(value, context, meta.listKey, meta.fieldKey);
          }
        },
        update: {
          arg: graphql.arg({ type: NestedSetFieldInput }),
          async resolve() {
            return null;
          }
          // async resolve(value, context) {
          //   // if (value === undefined || value === null) {
          //   //   return value;
          //   // }
          //   console.log('object');
          //   return updateInputResolver(value, context, meta.listKey, meta.fieldKey, currentItem);
          // },
        },
        orderBy: {
          arg: graphql.arg({ type: orderDirectionEnum }),
          resolve: (direction) => {
            return {
              left: direction
            };
          }
        }
      },
      output: graphql.field({
        type: NestedSetFieldOutput,
        resolve({ value: { left, right, depth } }) {
          if (left === null || right === null || depth === null) {
            return null;
          }
          return { left, right, depth };
        }
      }),
      views,
      unreferencedConcreteInterfaceImplementations: [NestedSetFieldOutput]
    });
  };
