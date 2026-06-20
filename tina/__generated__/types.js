export function gql(strings, ...args) {
  let str = "";
  strings.forEach((string, i) => {
    str += string + (args[i] || "");
  });
  return str;
}
export const WorksPartsFragmentDoc = gql`
    fragment WorksParts on Works {
  __typename
  title
  description
  image
  tags
  software
  work_date
  pinned
  sort_order
  size_weight
}
    `;
export const SectionsPartsFragmentDoc = gql`
    fragment SectionsParts on Sections {
  __typename
  title
  content
}
    `;
export const SettingsPartsFragmentDoc = gql`
    fragment SettingsParts on Settings {
  __typename
  name
  nameEn
  tagline
  introContent
  email
  phone
  wechat
  city
  github
  artstation
  title
  description
}
    `;
export const WorksDocument = gql`
    query works($relativePath: String!) {
  works(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...WorksParts
  }
}
    ${WorksPartsFragmentDoc}`;
export const WorksConnectionDocument = gql`
    query worksConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: WorksFilter) {
  worksConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...WorksParts
      }
    }
  }
}
    ${WorksPartsFragmentDoc}`;
export const SectionsDocument = gql`
    query sections($relativePath: String!) {
  sections(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...SectionsParts
  }
}
    ${SectionsPartsFragmentDoc}`;
export const SectionsConnectionDocument = gql`
    query sectionsConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: SectionsFilter) {
  sectionsConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...SectionsParts
      }
    }
  }
}
    ${SectionsPartsFragmentDoc}`;
export const SettingsDocument = gql`
    query settings($relativePath: String!) {
  settings(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...SettingsParts
  }
}
    ${SettingsPartsFragmentDoc}`;
export const SettingsConnectionDocument = gql`
    query settingsConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: SettingsFilter) {
  settingsConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...SettingsParts
      }
    }
  }
}
    ${SettingsPartsFragmentDoc}`;
export function getSdk(requester) {
  return {
    works(variables, options) {
      return requester(WorksDocument, variables, options);
    },
    worksConnection(variables, options) {
      return requester(WorksConnectionDocument, variables, options);
    },
    sections(variables, options) {
      return requester(SectionsDocument, variables, options);
    },
    sectionsConnection(variables, options) {
      return requester(SectionsConnectionDocument, variables, options);
    },
    settings(variables, options) {
      return requester(SettingsDocument, variables, options);
    },
    settingsConnection(variables, options) {
      return requester(SettingsConnectionDocument, variables, options);
    }
  };
}
import { createClient } from "tinacms/dist/client";
const generateRequester = (client) => {
  const requester = async (doc, vars, options) => {
    let url = client.apiUrl;
    if (options?.branch) {
      const index = client.apiUrl.lastIndexOf("/");
      url = client.apiUrl.substring(0, index + 1) + options.branch;
    }
    const data = await client.request({
      query: doc,
      variables: vars,
      url
    }, options);
    return { data: data?.data, errors: data?.errors, query: doc, variables: vars || {} };
  };
  return requester;
};
export const ExperimentalGetTinaClient = () => getSdk(
  generateRequester(
    createClient({
      url: "http://localhost:4001/graphql",
      queries
    })
  )
);
export const queries = (client) => {
  const requester = generateRequester(client);
  return getSdk(requester);
};
