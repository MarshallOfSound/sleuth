import { CooperSignInOutButton } from '../cooper/sign-in-out-button';
import { lineToCooperLine } from '../../cooper/line-to-cooper-line';
import { SleuthState, sleuthState } from '../../state/sleuth';
import * as React from 'react';
import { cooperComments, IAuthor, IComment, IGetCommentResponse } from '../../cooper/comments';
import { observer } from 'mobx-react';
import { PostComment } from './post';
import { Comment } from './comment';

const debug = require('debug')('sleuth:cooper');

export interface LogLineCommentsProps {
  state: SleuthState;
}

export interface LogLineCommentsState {
  comments: Array<any>;
  authors: Array<IAuthor>;
  line: string;
  lineId: string;
}

@observer
export class LogLineComments extends React.Component<LogLineCommentsProps, Partial<LogLineCommentsState>> {
  private lineChangeElement: HTMLInputElement;
  private readonly refHandlers = {
    lineChangeElement: (ref: HTMLInputElement) => this.lineChangeElement = ref,
  };

  constructor(props: LogLineCommentsProps) {
    super(props);

    this.state = {
      comments: [],
      authors: [],
      line: props.state.selectedEntry ? lineToCooperLine.convert(props.state.selectedEntry.message) : ''
    };

    this.renderComment = this.renderComment.bind(this);
    this.refresh = this.refresh.bind(this);
    this.updateSearch = this.updateSearch.bind(this);

    this.fetchComments(this.state.line, props.state.isCooperSignedIn, props.state.selectedEntry.logType);
  }

  public refresh() {
    this.fetchComments();
  }

  public componentWillReceiveProps(nextProps: LogLineCommentsProps) {
    const newSignInStatus = nextProps.state.isCooperSignedIn !== this.props.state.isCooperSignedIn;

    if (nextProps.state.selectedEntry && nextProps.state.selectedEntry.message || newSignInStatus) {
      const line = lineToCooperLine.convert(nextProps.state.selectedEntry.message);
      this.setState({ line });
      this.fetchComments(line, nextProps.state.isCooperSignedIn, nextProps.state.selectedEntry.logType);

      if (this.lineChangeElement) {
        this.lineChangeElement.value = line;
      }
    }
  }

  public updateSearch() {
    const newLine = this.lineChangeElement ? this.lineChangeElement.value : null;

    if (newLine) {
      this.setState({ line: newLine });
      this.fetchComments(newLine);
    }
  }

  public async fetchComments(line?: string, isSignedIn?: boolean, log?: string) {
    log = log || this.props.state.selectedEntry.logType;
    line = line || this.state.line;
    isSignedIn = isSignedIn || this.props.state.isCooperSignedIn;

    if (line && isSignedIn) {
      debug(`Fetching comments for line ${line}`);

      cooperComments.getComments(line, log)
        .then((result: IGetCommentResponse) => {
          debug(result);
          if (result && result.comments) {
            this.setState({
              comments: result.comments,
              authors: result.authors,
              lineId: result._id
            });
          }
        });
    } else {
      debug('No line');
    }
  }

  public renderComment(commentObject: IComment) {
    const { comment, authorId, timestamp, id } = commentObject;
    const { lineId } = this.state;
    const author = this.state.authors!.find((a) => a._id === authorId);

    if (!author) return null;
    const { name, avatar, slackUserId } = author;
    const options = { lineId, comment, name, avatar, timestamp, slackUserId, commentId: id };

    return <Comment didPost={this.refresh} state={sleuthState} key={timestamp} {...options} />;
  }

  public renderSignInNeccessary() {
    return (
      <div className='Comments'>
        <h4>Log Intelligence</h4>
        <p>Sign in to see and post information about this log line left by fellow sibs.</p>
        <CooperSignInOutButton state={sleuthState} />
      </div>
    );
  }

  public render() {
    const { isCooperSignedIn } = this.props.state;
    const { comments, line, lineId } = this.state;
    const renderedComments = comments!.map(this.renderComment);

    if (!line) return null;
    if (!isCooperSignedIn) return this.renderSignInNeccessary();

    return (
      <div className='Comments'>
        <h4>Log Intelligence</h4>
        <div className='IntelligenceComment'>
          <label htmlFor='small_input'>To fetch comments, we generalize the log line. This one was understood as:</label>
          <div className='InputButton'>
            <input defaultValue={line} ref={this.refHandlers.lineChangeElement} type='text' id='small_input' className='small' />
            <button className='btn btn_small' type='button' onClick={this.updateSearch}>Change Search</button>
          </div>
        </div>
        {renderedComments}
        <PostComment lineId={lineId} line={line} didPost={this.refresh} state={sleuthState} />
      </div>
    );
  }
}