import React, { useState } from 'react';
import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from 'reactstrap';
import styled from 'styled-components';
import { useStore } from '../../hooks';

export interface Period {
  id: number;
  name: string;
}

const Container = styled.div`
  margin-right: 10px;
  @media only screen and (max-width: 990px) {
    margin: 10px 0px;
  }
  @media only screen and (max-width: 770px) {
    margin: 10px 0px;
  }
`;

const periods: Period[] = [
  { id: 1, name: '1 day' },
  { id: 2, name: '7 days' },
  { id: 3, name: '14 days' },
  { id: 4, name: '30 days' },
  { id: 5, name: '45 days' }
];

const convertDropdownValue = (dropdownvalue: string): string => {
  const now = 'NOW - ';
  switch (dropdownvalue) {
    case '1 day':
      return `${now}1day`;
    case '7 days':
      return `${now}7days`;
    case '14 days':
      return `${now}14days`;
    case '30 days':
      return `${now}30days`;
    case '45 days':
      return `${now}45days`;
    default:
      return `${now}7days`;
  }
};

export default function DropdownSelect() {
  const numOfDays = useStore((state) => state.numOfDays);
  const setNumOfDays = useStore((state) => state.setNumOfDays);
  const setStartTime = useStore((state) => state.setStartTime);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const changeDropdownIcon = () => {
    setDropdownOpen((prevState) => (prevState ? false : true));
  };

  return (
    <Container style={{ marginRight: '0%' }}>
      <Dropdown
        isOpen={dropdownOpen}
        toggle={changeDropdownIcon}
        direction="down">
        <DropdownToggle caret> Data for the Past: {numOfDays}</DropdownToggle>
        <DropdownMenu>
          {periods.map(({ id, name }) => (
            <DropdownItem
              key={id}
              onClick={(e: React.MouseEvent<HTMLElement>) => {
                const dropdownvalue = e.currentTarget.textContent;
                if (dropdownvalue) {
                  setNumOfDays(dropdownvalue);
                  setStartTime(convertDropdownValue(dropdownvalue));
                }
              }}>
              {name}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </Container>
  );
}
