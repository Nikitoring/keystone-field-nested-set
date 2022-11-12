/** @jsxRuntime classic */
/** @jsx jsx */
import { jsx } from '@keystone-ui/core';
import { FieldContainer, FieldLabel } from '@keystone-ui/fields';

import {
  CardValueComponent,
  CellComponent,
  FieldController,
  FieldControllerConfig,
  FieldProps,
} from '@keystone-6/core/types';

import { useList } from '@keystone-6/core/admin-ui/context';

import { CellLink, CellContainer } from '@keystone-6/core/admin-ui/components';

import { NestedSetInput } from './NestedSetInput';

export const Cell: CellComponent = ({ item, field, linkTo }) => {
  let value = item[field.path].parentId ?? '';
  return linkTo ? <CellLink {...linkTo}>{value}</CellLink> : <CellContainer>{value}</CellContainer>;
};
Cell.supportsLinkTo = true;

export const CardValue: CardValueComponent = ({ item, field }) => {
  return (
    <FieldContainer>
      <FieldLabel>{field.label}</FieldLabel>
      {item[field.path]}
    </FieldContainer>
  );
};

export const Field = ({ field, value, onChange, autoFocus }: FieldProps<typeof controller>) => {
  const foreignList = useList(field.refListKey);
  return (
    <FieldContainer>
      <FieldLabel htmlFor={field.path}>{field.label}</FieldLabel>
      <NestedSetInput
        list={foreignList}
        onChange={onChange}
        state={value}
        autoFocus={autoFocus}
        graphqlSelection={field.graphqlSelection}
        path={field.path}
      />
    </FieldContainer>
  );
};

type NestedSetData = {
  kind: 'one';
  initialValue: { label: string; id: string } | null;
  value: { label: string; id: string } | null;
};

export type NestedSetValue = null | NestedSetData;

type NestedSetControllerDisplay = {
  mode: string,
  refLabelField: string;
}

type NestedSetController = FieldController<NestedSetValue> & {
  listKey: string;
  refListKey: string;
  labelField: string;
  display: NestedSetControllerDisplay;
};

export const controller = (
  config: FieldControllerConfig<{
    listKey: string;
    labelField: string;
    displayMode: string;
  }>
): NestedSetController => {
  return {
    path: config.path,
    label: config.label,
    labelField: 'parentId',
    description: config.description,
    defaultValue: {
      kind: 'one',
      initialValue: null,
      value: null,
    },
    listKey: config.listKey,
    refListKey: config.fieldMeta.listKey,
    display: {
      mode: 'select',
      refLabelField: config.fieldMeta.labelField,
    },
    graphqlSelection: `${config.path} {
      left,
      right,
      depth,
      parentId
    }`,
    deserialize: data => {
      return data[config.path];
    },
    serialize: value => {
      if ((value && !value.value) || !value?.initialValue) {
        return {
          [config.path]: {
            ...value,
          },
        };
      }
      return value;
    },
  };
};
