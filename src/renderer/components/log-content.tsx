import { isLogFile } from '../../utils/is-logfile';
import { ProcessedLogFile } from '../interfaces';
import { StateTable } from './state-table';
import { SleuthState, sleuthState } from '../state/sleuth';
import { LogTable } from './log-table';
import { observer } from 'mobx-react';
import React from 'react';

import { LogLineDetails } from './log-line-details/details';
import { Scrubber } from './scrubber';

export interface LogContentProps {
  state: SleuthState;
}

export interface LogContentState {
  tableHeight: number;
}

@observer
export class LogContent extends React.Component<LogContentProps, Partial<LogContentState>> {
  constructor(props: LogContentProps) {
    super(props);

    this.state = {
      tableHeight: 600
    };

    this.resizeHandler = this.resizeHandler.bind(this);
  }

  public resizeHandler(height: number) {
    if (height < 100 || height > (window.innerHeight - 100)) return;
    this.setState({ tableHeight: height });
  }

  public render(): JSX.Element | null {
    const {
      selectedLogFile,
      levelFilter,
      search,
      dateTimeFormat,
      font,
      isDetailsVisible,
      showOnlySearchResults,
      searchIndex,
      dateRange
    } = this.props.state;

    if (!selectedLogFile) return null;
    const isLog = isLogFile(selectedLogFile);
    const tableStyle = { height: isDetailsVisible ? `${this.state.tableHeight}px` : undefined };
    const scrubber = <Scrubber elementSelector='div#LogTableContainer' onResizeHandler={this.resizeHandler} />;

    if (isLog) {
      return (
        <div className='LogContent' style={{ fontFamily: font }}>
          <div id='LogTableContainer' style={tableStyle}>
            <LogTable
              state={sleuthState}
              dateTimeFormat={dateTimeFormat}
              logFile={selectedLogFile as ProcessedLogFile}
              levelFilter={levelFilter}
              search={search}
              showOnlySearchResults={showOnlySearchResults}
              searchIndex={searchIndex}
              dateRange={dateRange}
            />
          </div>
          {isDetailsVisible ? scrubber : null}
          <LogLineDetails state={sleuthState} />
        </div>
      );
    } else {
      return <div><StateTable state={sleuthState} /></div>;
    }
  }
}
