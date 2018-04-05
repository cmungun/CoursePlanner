import React from "react";
import {Card, CardHeader, CardText} from 'material-ui/Card';
import ErrorIcon from 'material-ui/svg-icons/alert/error';
import WarningIcon from 'material-ui/svg-icons/alert/warning';

import {UI_STRINGS, LOADING_ICON_TYPES, COURSE_EXEMPTIONS} from "../util/util";

const ListItem = ({type, message, onMouseEnter, onMouseLeave}) => {
    return (
        <div className={"validationListItem " + (type === "issue" ? "issue" : "warning")}
             onMouseEnter={onMouseEnter}
             onMouseLeave={onMouseLeave}>
            <div className="validationListIcon">{type === "issue" ? <ErrorIcon color="#6c1540"/> : <WarningIcon color="#f5bb2b"/>}</div>
            <div className="validationMessage">{message}</div>
        </div>
    );
};

/*
 *  Material UI Card which displays the results of the most recent sequence validation
 *
 *  Expects props:
 *
 *  validationResults - see MainPage.state.validationResults
 *  onMouseEnterItem - see MainPage.highlightCourses
 *  onMouseLeaveItem - see MainPage.unhighlightCourses
 *
 */
export class SequenceValidationCard extends React.Component {

    constructor(props){
        super(props);
    }

    generateListItems(issues, warnings) {
        let listItems = [];

        // add all issues and warnings to listItems list

        issues.forEach((issue) => {

            let itemType = "issue";

            if(issue.type === "prerequisite" || issue.type === "corequisite"){
                issue.data.unmetRequirements.forEach((requirement) => {
                    let shouldSkip = false;
                    // skip issues that include an exempted courseCode requirement
                    requirement.forEach((courseCode) => {
                        COURSE_EXEMPTIONS.indexOf(courseCode) >= 0 && (shouldSkip = true);
                    });
                    if(!shouldSkip){
                        listItems.push({
                            type: itemType,
                            positionsToHighlight: [issue.data.position],
                            message : (
                                issue.data.courseCode + " is missing " +
                                issue.type + ": " + requirement.join(" or ")
                            )
                        });
                    }
                });
            }

            if(issue.type === "creditCount") {
                listItems.push({
                    type: itemType,
                    positionsToHighlight: [],
                    message: (
                        "Sequence contains only " + issue.data.actual +
                        " of " +  issue.data.required + " required credits"
                    )
                });
            }
        });

        warnings.forEach((warning) => {

            let itemType = "warning";

            if(warning.type === "repeated") {
                listItems.push({
                    type: itemType,
                    positionsToHighlight: warning.data.positions,
                    message: (
                        warning.data.courseCode + " is repeated " +
                        warning.data.positions.length + " times in the sequence"
                    )
                });
            }


            if(warning.type === "unselectedOption") {
                listItems.push({
                    type: itemType,
                    positionsToHighlight: [warning.data.position],
                    message: (
                        "No option selected in " + warning.data.position.season +
                        " of  year " +  (parseInt(warning.data.position.yearIndex) + 1) +
                        ", entry number " + (parseInt(warning.data.position.courseIndex) + 1)
                    )
                });
            }

        });

        return listItems;
    }
    
    renderCardHeader(isValid, isLoading) {
        
        let title, loadingIcon;

        if(isLoading){
            title = UI_STRINGS.VALIDATION_LOADING;
            loadingIcon = LOADING_ICON_TYPES.small;
        } else if(isValid) {
            title = UI_STRINGS.VALIDATION_SUCCESS_MSG;
        } else {
            title = UI_STRINGS.VALIDATION_FAILURE_MSG;
        }
        
        return (
            <CardHeader title={title}
                        actAsExpander={!isValid}
                        showExpandableButton={!isValid}
                        closeIcon={loadingIcon}
                        openIcon={loadingIcon}/>
        );
    }

    renderCardText(listItems) {
        return (
            <CardText expandable={true}>
                {listItems.map((item, index) => (
                    <ListItem type={item.type}
                              message={item.message}
                              key={index}
                              onMouseEnter={() => this.props.onMouseEnterItem(item.positionsToHighlight)}
                              onMouseLeave={() => this.props.onMouseLeaveItem(item.positionsToHighlight)}/>
                ))}
            </CardText>
        );
    }

    render() {
        let issues = this.props.validationResults.issues;
        let warnings = this.props.validationResults.warnings;
        let listItems = this.generateListItems(issues, warnings);
        let isValid = this.props.validationResults.isValid === "true" || listItems.length === 0;
        let isLoading = this.props.validationResults.isLoading;
        return (
            <Card>
                {this.renderCardHeader(isValid, isLoading)}
                {!isValid && this.renderCardText(listItems)}
            </Card>
        );
    }
}