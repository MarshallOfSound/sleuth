import { SleuthState } from '../../state/sleuth';
import React from 'react';
import {observer} from 'mobx-react';
import Ladda from 'react-ladda';
import { cooperAuth } from '../../cooper/auth';

export interface SignInOutButtonProps {
  state: SleuthState;
}

export interface SignInOutButtonState {
  isLoading: boolean;
}

@observer
export class CooperSignInOutButton extends React.Component<SignInOutButtonProps, Partial<SignInOutButtonState>> {
  constructor(props: SignInOutButtonProps) {
    super(props);

    this.state = { isLoading: false };
    this.onClick = this.onClick.bind(this);
  }

  public onClick(e: React.MouseEvent<HTMLButtonElement>) {
    const isSignIn = (e.target as HTMLButtonElement).textContent === 'Sign In';
    const method = isSignIn ? cooperAuth.signIn : cooperAuth.signOut;

    this.setState({ isLoading: true });
    method().then(() => this.setState({ isLoading: false }));
  }

  public render(): JSX.Element {
    const { isCooperSignedIn } = this.props.state;
    const { isLoading } = this.state;
    const buttonOptions = { className: 'btn', loading: isLoading, onClick: this.onClick };

    return (
      <div>
        <Ladda {...buttonOptions}>Sign {isCooperSignedIn ? 'Out' : 'In'}</Ladda>
      </div>
    );
  }
}
