import { restore, modal, openNativeEditor } from "__support__/e2e/cypress";

describe.skip("issue 21550", () => {
  beforeEach(() => {
    restore();
    cy.signInAsAdmin();

    cy.intercept("GET", "/api/collection/root/items?**").as("rootCollection");
    cy.intercept("GET", "/api/native-query-snippet/**").as("snippet");
  });

  it("should not show scrollbars for very short snippet (metabase#21550)", () => {
    openNativeEditor();

    cy.icon("snippet").click();
    cy.wait("@rootCollection");
    cy.contains("Create a snippet").click();

    modal().within(() => {
      cy.findByLabelText("Enter some SQL here so you can reuse it later").type(
        "select * from people",
      );
      cy.findByLabelText("Give your snippet a name").type("people");
      cy.findByText("Save").click();
      cy.wait("@rootCollection");
    });

    cy.findByText("people").realHover();
    cy.get(".Icon-chevrondown").click({ force: true });

    cy.get("pre").then($pre => {
      const preWidth = $pre[0].getBoundingClientRect().width;
      const clientWidth = $pre[0].clientWidth;
      const BORDERS = 2; // 1px left and right
      expect(clientWidth).to.be.gte(preWidth - BORDERS);
    });
  });
});
