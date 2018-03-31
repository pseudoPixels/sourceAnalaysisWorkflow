from ._workflow_fixtures import (
    WORKFLOW_SIMPLE_CAT_TWICE,
    WORKFLOW_WITH_OLD_TOOL_VERSION,
)
from .framework import (
    selenium_test,
    SeleniumTestCase,
    UsesHistoryItemAssertions,
)


class WorkflowRunTestCase(SeleniumTestCase, UsesHistoryItemAssertions):

    ensure_registered = True

    @selenium_test
    def test_simple_execution(self):
        self.perform_upload(self.get_filename("1.fasta"))
        self.wait_for_history()

        workflow_populator = self.workflow_populator
        workflow_populator.upload_yaml_workflow(WORKFLOW_SIMPLE_CAT_TWICE)
        self.workflow_index_open()
        self.workflow_index_click_option("Run")

        self.screenshot("workflow_manage_run_simple")
        self.workflow_run_submit()

        self.history_panel_wait_for_hid_ok(2, allowed_force_refreshes=1)
        self.history_panel_click_item_title(hid=2, wait=True)
        self.assert_item_summary_includes(2, "2 sequences")

    @selenium_test
    def test_execution_with_tool_upgrade(self):
        workflow_populator = self.workflow_populator
        workflow_populator.upload_yaml_workflow(WORKFLOW_WITH_OLD_TOOL_VERSION, exact_tools=True)

        self.workflow_index_open()
        self.workflow_index_click_option("Run")
        self.sleep_for(self.wait_types.UX_TRANSITION)
        # Check that this tool form contains a warning about different versions.
        self.assert_warning_message(contains="different versions")
        self.screenshot("workflow_manage_run_tool_upgrade")
