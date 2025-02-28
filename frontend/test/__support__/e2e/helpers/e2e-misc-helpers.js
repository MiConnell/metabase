// Find a text field by label text, type it in, then blur the field.
// Commonly used in our Admin section as we auto-save settings.
export function typeAndBlurUsingLabel(label, value) {
  cy.findByLabelText(label)
    .clear()
    .type(value)
    .blur();
}

export function visitAlias(alias) {
  cy.get(alias).then(url => {
    cy.visit(url);
  });
}

/**
 * Open native (SQL) editor and alias it.
 *
 * @param {object} options
 * @param {string} [options.databaseName] - If there is more than one database, select the desired one by its name.
 * @param {string} [options.alias="editor"] - The alias that can be used later in the test as `cy.get("@" + alias)`.
 * @example
 * openNativeEditor().type("SELECT 123");
 * @example
 * openNativeEditor({ databaseName: "QA Postgres12" }).type("SELECT 123");
 */
export function openNativeEditor({
  databaseName,
  alias = "editor",
  fromCurrentPage,
} = {}) {
  if (!fromCurrentPage) {
    cy.visit("/");
  }
  cy.findByText("New").click();
  cy.findByText("SQL query").click();

  databaseName && cy.findByText(databaseName).click();

  return cy
    .get(".ace_content")
    .as(alias)
    .should("be.visible");
}

/**
 * Executes native query and waits for the results to load.
 * Makes sure that the question is not "dirty" after the query successfully ran.
 * @param {string} [xhrAlias ="dataset"]
 */
export function runNativeQuery(xhrAlias = "dataset") {
  cy.get(".NativeQueryEditor .Icon-play").click();
  cy.wait("@" + xhrAlias);
  cy.icon("play").should("not.exist");
}

/**
 * Intercepts a request and returns resolve function that allows
 * the request to continue
 *
 * @param {string} method - Request method ("GET", "POST", etc)
 * @param {string} path - Request URL to intercept
 * @example
 * const req = interceptPromise("GET", "/dashboard/1");
 * // ... do something before request is allowed to go through ...
 * req.resolve();
 */
export function interceptPromise(method, path) {
  const state = {};
  const promise = new Promise(resolve => {
    state.resolve = resolve;
  });
  cy.intercept(method, path, req => {
    return promise.then(() => {
      req.continue();
    });
  });
  return state;
}

/**
 * Executes and waits for all Cypress commands sequentially.
 * Helps to avoid excessive nesting and verbosity
 *
 * @param {Array.<Cypress.Chainable<any>>} commands - Cypress commands
 * @example
 * cypressWaitAll([
 *   cy.createQuestionAndAddToDashboard(firstQuery, 1),
 *   cy.createQuestionAndAddToDashboard(secondQuery, 1),
 * ]).then(() => {
 *   cy.visit(`/dashboard/1`);
 * });
 */
const cypressWaitAllRecursive = (results, currentCommand, commands) => {
  return currentCommand.then(result => {
    results.push(result);

    const [nextCommand, ...rest] = Array.from(commands);

    if (nextCommand == null) {
      return results;
    }

    return cypressWaitAllRecursive(results, nextCommand, rest);
  });
};

export const cypressWaitAll = function(commands) {
  const results = [];

  return cypressWaitAllRecursive(
    results,
    cy.wrap(null, { log: false }),
    commands,
  );
};

/**
 * Visit a question and wait for its query to load.
 *
 * @param {number} id
 */
export function visitQuestion(id) {
  // In case we use this function multiple times in a test, make sure aliases are unique for each question
  const alias = "cardQuery" + id;

  // We need to use the wildcard becase endpoint for pivot tables has the following format: `/api/card/pivot/${id}/query`
  cy.intercept("POST", `/api/card/**/${id}/query`).as(alias);

  cy.visit(`/question/${id}`);

  cy.wait("@" + alias);
}

/**
 * Visit a dashboard and wait for its query to load.
 *
 * NOTE: Avoid using this helper if you need to explicitly wait for
 * and assert on the individual dashcard queries.
 *
 * @param {number} id
 */
export function visitDashboard(id) {
  cy.intercept("GET", `/api/dashboard/${id}`).as("getDashboard");
  // The very last request when visiting dashboard always checks the collection it is in.
  // That is - IF user has the permission to view that dashboard!
  cy.intercept("GET", `/api/collection/*`).as("getParentCollection");

  cy.visit(`/dashboard/${id}`);

  // If users doesn't have permissions to even view the dashboard,
  // the last request for them would be `getDashboard`.
  cy.wait("@getDashboard").then(({ response: { statusCode } }) => {
    canViewDashboard(statusCode) && cy.wait("@getParentCollection");
  });
}

function canViewDashboard(statusCode) {
  return statusCode !== 403;
}
