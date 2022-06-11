import _objectSpread from '@babel/runtime/helpers/esm/objectSpread2';
import { jsx } from '@keystone-ui/core';
import { Select, Radio, selectComponents, FieldContainer, FieldLabel } from '@keystone-ui/fields';
import { useList } from '@keystone-6/core/admin-ui/context';
import { CellLink, CellContainer } from '@keystone-6/core/admin-ui/components';
import _objectWithoutProperties from '@babel/runtime/helpers/esm/objectWithoutProperties';
import _toPropertyKey from '@babel/runtime/helpers/esm/toPropertyKey';
import 'intersection-observer';
import { useState, useMemo, useContext, createContext, useEffect } from 'react';
import { gql, useApolloClient, ApolloClient, InMemoryCache, useQuery } from '@keystone-6/core/admin-ui/apollo';

const _excluded = ["children"];
const idField = '____id____';
const labelField = '____label____';
const LoadingIndicatorContext = /*#__PURE__*/createContext({
  count: 0,
  ref: () => {}
});

function useFilter(search, list) {
  return useMemo(() => {
    let conditions = [];

    if (search.length) {
      const trimmedSearch = search.trim();

      for (const field of Object.values(list.fields)) {
        if (field.search !== null) {
          conditions.push({
            [field.path]: {
              contains: trimmedSearch,
              mode: field.search === 'insensitive' ? 'insensitive' : undefined
            }
          });
        }
      }
    }

    return {
      OR: conditions
    };
  }, [search, list]);
}

function useIntersectionObserver(cb, ref) {
  useEffect(() => {
    let observer = new IntersectionObserver(cb, {});
    let node = ref.current;

    if (node !== null) {
      observer.observe(node);
      return () => observer.unobserve(node);
    }
  });
}

function useDebouncedValue(value, limitMs) {
  const [debouncedValue, setDebouncedValue] = useState(() => value);
  useEffect(() => {
    let id = setTimeout(() => {
      setDebouncedValue(() => value);
    }, limitMs);
    return () => {
      clearTimeout(id);
    };
  }, [value, limitMs]);
  return debouncedValue;
}

const initialItemsToLoad = 10;
const subsequentItemsToLoad = 50;
const NestedSetInput = _ref => {
  var _data$items;

  let {
    autoFocus,
    isDisabled,
    isLoading,
    list,
    state,
    field,
    onChange,
    graphqlSelection,
    path
  } = _ref;
  const [search, setSearch] = useState('');
  const [variant, setVariant] = useState('parentId');
  const [loadingIndicatorElement, setLoadingIndicatorElement] = useState(null);
  const orderByField = {
    [path]: 'asc'
  };
  const QUERY = gql`
    query NestedSetSelect($where: ${list.gqlNames.whereInputName}!, $take: Int!, $skip: Int!, $orderBy: [${list.gqlNames.listOrderName}!] ) {
      items: ${list.gqlNames.listQueryName}(where: $where, take: $take, skip: $skip, orderBy: $orderBy) {
        ${idField}: id
        ${labelField}: ${list.labelField}
        ${graphqlSelection}
      }
      count: ${list.gqlNames.listQueryCountName}(where: $where)
    }
  `;
  const debouncedSearch = useDebouncedValue(search, 200);
  const where = useFilter(debouncedSearch, list);
  const link = useApolloClient().link;
  const apolloClient = useMemo(() => new ApolloClient({
    link,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            [list.gqlNames.listQueryName]: {
              keyArgs: ['where'],
              merge: (existing, incoming, _ref2) => {
                let {
                  args
                } = _ref2;
                const merged = existing ? existing.slice() : [];
                const {
                  skip
                } = args;

                for (let i = 0; i < incoming.length; ++i) {
                  merged[skip + i] = incoming[i];
                }

                return merged;
              }
            }
          }
        }
      }
    })
  }), [link, list.gqlNames.listQueryName]);

  const generateIndent = (label, data) => {
    const depth = data && data[path] ? data[path].depth : 0;
    let text = '';

    if (depth > 0) {
      for (let i = 0; i < depth; i++) {
        text += '- ';
      }
    }

    text += label;
    return text;
  };

  const {
    data,
    error,
    loading,
    fetchMore
  } = useQuery(QUERY, {
    fetchPolicy: 'network-only',
    variables: {
      where,
      take: initialItemsToLoad,
      skip: 0,
      orderBy: orderByField
    },
    client: apolloClient
  });
  const count = (data === null || data === void 0 ? void 0 : data.count) || 0;
  const options = (data === null || data === void 0 ? void 0 : (_data$items = data.items) === null || _data$items === void 0 ? void 0 : _data$items.map(_ref3 => {
    let {
      [idField]: value,
      [labelField]: label
    } = _ref3,
        data = _objectWithoutProperties(_ref3, [idField, labelField].map(_toPropertyKey));

    return {
      value,
      label: generateIndent(label || value, data),
      [path]: data[path],
      isDisabled: !data[path] ? true : false,
      data
    };
  })) || [];
  let value = {};

  if (state !== null && state !== void 0 && state.parentId) {
    value = options.find(option => option.value === state.parentId);
  }

  if (state !== null && state !== void 0 && state.prevSiblingOf) {
    value = options.find(option => option.value === state.prevSiblingOf);
  }

  if (state !== null && state !== void 0 && state.nextSiblingOf) {
    value = options.find(option => option.value === state.nextSiblingOf);
  }

  const loadingIndicatorContextVal = useMemo(() => ({
    count,
    ref: setLoadingIndicatorElement
  }), [count]);
  const [lastFetchMore, setLastFetchMore] = useState(null);
  useIntersectionObserver(_ref4 => {
    let [{
      isIntersecting
    }] = _ref4;
    const skip = data === null || data === void 0 ? void 0 : data.items.length;

    if (!loading && skip && isIntersecting && options.length < count && ((lastFetchMore === null || lastFetchMore === void 0 ? void 0 : lastFetchMore.where) !== where || (lastFetchMore === null || lastFetchMore === void 0 ? void 0 : lastFetchMore.list) !== list || (lastFetchMore === null || lastFetchMore === void 0 ? void 0 : lastFetchMore.skip) !== skip)) {
      const QUERY = gql`
              query NestedSetSelectMore($where: ${list.gqlNames.whereInputName}!, $take: Int!, $skip: Int!, $orderBy: [${list.gqlNames.listOrderName}!]) {
                items: ${list.gqlNames.listQueryName}(where: $where, take: $take, skip: $skip, orderBy: $orderBy) {
                  ${labelField}: ${list.labelField}
                  ${idField}: id,
                  ${graphqlSelection}
                }
              }
            `;
      setLastFetchMore({
        list,
        skip,
        where
      });
      fetchMore({
        query: QUERY,
        variables: {
          where,
          take: subsequentItemsToLoad,
          skip,
          orderBy: orderByField
        }
      }).then(() => {
        setLastFetchMore(null);
      }).catch(() => {
        setLastFetchMore(null);
      });
    }
  }, {
    current: loadingIndicatorElement
  });

  if (error) {
    return jsx("span", null, "Error");
  }

  const radioVariants = [{
    label: 'Parent',
    value: 'parentId',
    checked: true,
    disabled: false
  }, {
    label: 'Before',
    value: 'prevSiblingOf',
    disabled: false
  }, {
    label: 'After',
    value: 'nextSiblingOf',
    disabled: false
  }];
  const radioClass = {
    display: 'flex',
    marginTop: '1rem',
    flexDirection: 'column'
  };

  const setPosition = e => {
    setVariant(e.target.value);
  };

  const container = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'no-wrap'
  };
  const selectWidth = {
    width: '80%'
  };
  const radioButton = {
    marginBottom: '1rem'
  };

  const prepareData = value => {
    if (value) {
      if (variant === '') {
        onChange({
          parentId: value.value
        });
        return;
      }

      switch (variant) {
        case 'parentId':
          onChange({
            parentId: value.value
          });
          return;

        case 'prevSiblingOf':
          onChange({
            prevSiblingOf: value.value
          });
          return;

        case 'nextSiblingOf':
          onChange({
            nextSiblingOf: value.value
          });
          return;
      }
    }

    return;
  };

  return jsx("div", {
    style: container
  }, jsx("div", {
    style: selectWidth
  }, jsx(LoadingIndicatorContext.Provider, {
    value: loadingIndicatorContextVal
  }, jsx(Select, {
    onInputChange: val => setSearch(val),
    placeholder: "Select",
    isLoading: loading || isLoading,
    autoFocus: autoFocus,
    components: relationshipSelectComponents,
    value: value,
    options: options,
    onChange: value => {
      prepareData(value);
    },
    isDisabled: isDisabled,
    portalMenu: true,
    isClearable: true
  }))), jsx("div", {
    style: radioClass
  }, radioVariants.map((variant, index) => jsx("div", {
    style: radioButton,
    key: variant.value
  }, jsx(Radio, {
    name: "position",
    size: "medium",
    key: variant.value,
    defaultChecked: index === 0,
    className: "radioClass",
    value: variant.value,
    onChange: value => setPosition(value),
    disabled: variant.disabled
  }, variant.label)))));
};
const relationshipSelectComponents = {
  MenuList: _ref5 => {
    let {
      children
    } = _ref5,
        props = _objectWithoutProperties(_ref5, _excluded);

    const {
      count,
      ref
    } = useContext(LoadingIndicatorContext);
    return jsx(selectComponents.MenuList, props, children, jsx("div", {
      css: {
        textAlign: 'center'
      },
      ref: ref
    }, props.options.length < count && jsx("span", {
      css: {
        padding: 8
      }
    }, "Loading...")));
  }
};

const Cell = _ref => {
  let {
    item,
    field,
    linkTo
  } = _ref;
  let value = item[field.path] + '';
  return linkTo ? jsx(CellLink, linkTo, value) : jsx(CellContainer, null, value);
};
Cell.supportsLinkTo = true;
const CardValue = _ref2 => {
  let {
    item,
    field
  } = _ref2;
  return jsx(FieldContainer, null, jsx(FieldLabel, null, field.label), item[field.path]);
};
const Field = _ref3 => {
  let {
    field,
    value,
    onChange,
    autoFocus
  } = _ref3;
  const foreignList = useList(field.refListKey);
  return jsx(FieldContainer, null, jsx(FieldLabel, {
    htmlFor: field.path
  }, field.label), jsx(NestedSetInput, {
    list: foreignList,
    onChange: onChange,
    state: value,
    autoFocus: autoFocus,
    graphqlSelection: field.graphqlSelection,
    path: field.path
  }));
};
const controller = config => {
  return {
    path: config.path,
    label: config.label,
    listKey: config.listKey,
    refListKey: config.fieldMeta.listKey,
    display: {
      mode: 'select',
      refLabelField: config.fieldMeta.labelField
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
      if (value && !value.value || !(value !== null && value !== void 0 && value.initialValue)) {
        return {
          [config.path]: _objectSpread({}, value)
        };
      }

      return value;
    }
  };
};

export { CardValue, Cell, Field, controller };
