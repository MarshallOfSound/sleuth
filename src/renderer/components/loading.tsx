import React from 'react';
import { ProgressBar } from '@blueprintjs/core';

export interface LoadingProps {
  percentage?: number;
  message?: string;
}

/**
 * Sleuth's loading indicator. Used only during processing.
 *
 * @param {LoadingProps} props
 * @returns {JSX.Element}
 */
export const Loading = (props: LoadingProps) => {
  const { percentage, message } = props;

  if (percentage === 100) {
    return <div />;
  }

  return (
    <div className='Loading'>
      <ProgressBar animate={false} value={percentage! / 100} />
      <br />
      <p>{message}</p>
    </div>
  );
};
