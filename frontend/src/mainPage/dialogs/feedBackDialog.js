import React from "react";
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import Snackbar from 'material-ui/Snackbar';
import { FEEDBACK_SNACKBAR_AUTOHIDE_DURATION,
         FEEDBACK_CHAR_LIMIT,
         FEEDBACK_ROWS_MAX,
         UI_STRINGS,
         INLINE_STYLES} from '../../util/util';

import $ from "jquery";

export class FeedBackDialog extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            feedBackMsg: "",
            errorMsg: "",
            snackBar: {
                isShowing: false,
                message: ""
            }
        };

        this.updateTextField = this.updateTextField.bind(this);
        this.handleCloseSnackBar = this.handleCloseSnackBar.bind(this);
        this.handleCloseFeedBackBox = this.handleCloseFeedBackBox.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.sendFeedBackMsg = this.sendFeedBackMsg.bind(this);
        this.handleSendFeedBackSuccess = this.handleSendFeedBackSuccess.bind(this);
        this.handleSendFeedBackError = this.handleSendFeedBackError.bind(this);
    }

    updateTextField(event, value) {
        let errorMsg = "";

        if(value.length >= FEEDBACK_CHAR_LIMIT) {
            value = value.slice(0, FEEDBACK_CHAR_LIMIT);
            errorMsg = UI_STRINGS.FEEDBACK_CHAR_LIMIT_ERROR_MSG;
        }

        this.setState({
            feedBackMsg: value,
            errorMsg: errorMsg
        });
    }

    handleCloseSnackBar() {
        this.setState({
            snackBar: {
                isShowing: false,
                message: ""
            }
        });
    }

    handleCloseFeedBackBox() {
        this.props.onRequestClose();
        this.setState({
            feedBackMsg: "",
            errorMsg: ""
        });
    }

    handleSubmit() {
        if (this.state.feedBackMsg !== "") {
            this.sendFeedBackMsg();
            this.handleCloseFeedBackBox();
        }
    }

    render() {
        const actions = [
            <FlatButton
                label="Cancel"
                primary={false}
                onClick={this.handleCloseFeedBackBox}
            />,
            <FlatButton
                label="Submit"
                primary={true}
                onClick={this.handleSubmit}
            />,
        ];

        return (
            <div>
                <Dialog
                    title={UI_STRINGS.FEEDBACK_BOX_TITLE}
                    actions={actions}
                    onRequestClose={this.handleCloseFeedBackBox}
                    open={this.props.isOpen}
                >
                    <TextField
                        fullWidth={true}
                        multiLine={true}
                        rowsMax={FEEDBACK_ROWS_MAX}
                        maxLength={FEEDBACK_CHAR_LIMIT}
                        hintText={UI_STRINGS.FEEDBACK_PLACEHOLDER}
                        onChange={this.updateTextField}
                        errorText={this.state.errorMsg}
                        errorStyle={INLINE_STYLES.betterYellow}
                    />
                    <p className="charLimitIndicator">{this.state.feedBackMsg.length}/{FEEDBACK_CHAR_LIMIT}</p>
                </Dialog>
                <Snackbar
                    open={this.state.snackBar.isShowing}
                    message={this.state.snackBar.message}
                    autoHideDuration={FEEDBACK_SNACKBAR_AUTOHIDE_DURATION}
                    onRequestClose={this.handleCloseSnackBar}
                />
            </div>
        );
    }

    /*
     *  Backend API calls:
     */

    sendFeedBackMsg() {
        $.ajax({
            type: "POST",
            url: "api/feedback",
            data: JSON.stringify({ message: this.state.feedBackMsg }),
            success: this.handleSendFeedBackSuccess,
            error: this.handleSendFeedBackError
        });
    }

    handleSendFeedBackSuccess(response) {
        let responseObject = JSON.parse(response);
        if(responseObject.success) {
            this.setState({
                snackBar: {
                    isShowing: true,
                    message: UI_STRINGS.FEEDBACK_SEND_SUCCESS_MSG
                }
            });
        } else {
            this.handleSendFeedBackError(response);
        }
    }

    handleSendFeedBackError(response) {
        this.setState({
            snackBar: {
                isShowing: true,
                message: UI_STRINGS.FEEDBACK_SEND_ERROR_MSG
            }
        });
    }
}
