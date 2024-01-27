/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import _ from 'lodash';
import { useState } from 'react';
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Carousel,
  CarouselControl,
  CarouselIndicators,
  CarouselItem,
  Table
} from 'reactstrap';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

import DropdownSelect from './DropDownSelect';
import { useStore } from '../../hooks';

Chart.register(...registerables);

export default function NavBar() {
  const data = useStore((state) => state.data);
  const [isOpen, setIsOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [modalAnalysis, setModalAnalysis] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  const toggle = () => setModal(!modal);
  const toggleAnalysis = () => setModalAnalysis(!modalAnalysis);

  const next = () => {
    if (animating) return;
    const nextIndex = activeIndex === items.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(nextIndex);
  };

  const previous = () => {
    if (animating) return;
    const nextIndex = activeIndex === 0 ? items.length - 1 : activeIndex - 1;
    setActiveIndex(nextIndex);
  };

  const goToIndex = (newIndex: number) => {
    if (animating) return;
    setActiveIndex(newIndex);
  };

  const options1: any = {
    plugins: {
      title: {
        display: true,
        color: 'lightblue',
        font: { weight: 'bold', size: 20 },
        fullSize: false,
        padding: 3,
        text: 'Number of Earthquakes By Day'
      }
    }
  };

  const options2: any = {
    plugins: {
      title: {
        display: true,
        color: 'bllightblueue',
        font: { weight: 'bold', size: 20 },
        fullSize: false,
        padding: 3,
        text: 'Number of Earthquakes By Magnitude'
      }
    }
  };
  let items = [
    <CarouselItem
      className="custom-tag"
      tag="div"
      key={1}
      onExiting={() => setAnimating(true)}
      onExited={() => setAnimating(false)}>
      <Bar
        options={options1}
        data={{
          labels: data && _.reverse(data[0].map((d: any) => d.date)),
          datasets: [
            {
              label: 'Number of Earthquakes',
              data: data && _.reverse(data[0].map((d: any) => d.num)),
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1
            }
          ]
        }}
      />
    </CarouselItem>,
    <CarouselItem
      className="custom-tag"
      tag="div"
      key={2}
      onExiting={() => setAnimating(true)}
      onExited={() => setAnimating(false)}>
      <Bar
        options={options2}
        data={{
          labels: data && data[1].map((d: any) => d.mag),
          datasets: [
            {
              label: 'Number of Earthquakes',
              data: data && data[1].map((d: any) => d.num),
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1
            }
          ]
        }}
      />
    </CarouselItem>,
    <CarouselItem
      className="custom-tag"
      tag="div"
      key={2}
      onExiting={() => setAnimating(true)}
      onExited={() => setAnimating(false)}>
      {data && data[3] && (
        <Table responsive size="sm" hover>
          <thead>
            <tr>
              <th>#</th>
              <th>Country/State/Location</th>
              <th># of Earthquakes</th>
            </tr>
          </thead>
          <tbody>
            {data[3].map((d: any, i: number) => (
              <tr key={d.loc}>
                <th scope="row">{i + 1}</th>
                <td>{d.loc}</td>
                <td>{d.num}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </CarouselItem>
  ];

  return (
    <Navbar color="primary" dark expand="md" fixed="top">
      <NavbarBrand style={{ color: 'white' }}>
        GEOG1020 Project
        <Modal
          size="xl"
          isOpen={modal}
          toggle={toggle}
          style={{ zIndex: 9999999 }}>
          <ModalHeader toggle={toggle}>
            GEOG1020 Individual Project By Lee Chi Ho
          </ModalHeader>
          <ModalBody>
            This project is developed with the following Tech Stack:
            <br />
            React
            <br />
            Leaflet + React-Leaflet
            <br />
            Reactstrap (UI Component + Responsive Design)
            <br />
            Zustand (State Management)
            <br />
            The data set used is fetched from the{' '}
            <a
              href="https://earthquake.usgs.gov/fdsnws/event/1/"
              target="_blank"
              rel="noreferrer">
              USGS(United States Geological Survey) Earthquake API
            </a>{' '}
            which implements the International Federation of Digital Seismograph
            Networks (FDSN) interfaces. <br />
            The Tectonic Plates Boundaries Data are available{' '}
            <a
              href="https://github.com/fraxen/tectonicplates"
              target="_blank"
              rel="noreferrer">
              HERE
            </a>{' '}
            By fraxen on GitHub with Open Data Commons Attribution License.
            <br />
            The requested GeoJSON data is then parsed and displayed on the map
            using react-leaflet with tile layers from Google, OpenStreetMaps and
            CatroCDN.
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={toggle}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
        {/* ANALYSIS */}
        <Modal
          size="xl"
          isOpen={modalAnalysis}
          toggle={toggleAnalysis}
          style={{ zIndex: 9999999 }}>
          <ModalHeader toggle={toggleAnalysis}>
            ANALYSIS: {data && data[2]} Earthquakes
          </ModalHeader>
          <ModalBody>
            {data && (
              <Carousel
                interval={false}
                activeIndex={activeIndex}
                next={next}
                previous={previous}>
                <CarouselIndicators
                  items={items}
                  activeIndex={activeIndex}
                  onClickHandler={goToIndex}
                />
                {items}
                <CarouselControl
                  direction="prev"
                  directionText=""
                  onClickHandler={previous}
                  cssModule={{ color: 'black' }}
                />
                <CarouselControl
                  direction="next"
                  directionText=""
                  onClickHandler={next}
                />
              </Carousel>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={toggleAnalysis}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      </NavbarBrand>
      <NavbarToggler onClick={() => setIsOpen(!isOpen)} />
      <Collapse isOpen={isOpen} navbar>
        <Nav className="ml-auto" navbar>
          <Button color="danger" size="normal" onClick={toggle}>
            About This
          </Button>
          <Button color="warning" size="normal" onClick={toggleAnalysis}>
            Analysis
          </Button>
          <Button
            color="success"
            size="normal"
            onClick={() => {
              const l = document.getElementsByClassName(
                'legend'
              )[0] as HTMLElement;
              if (l.style.visibility === 'hidden') {
                l.style.visibility = 'visible';
              } else {
                l.style.visibility = 'hidden';
              }
            }}>
            Toggle Legend
          </Button>
          <DropdownSelect />
        </Nav>
      </Collapse>
    </Navbar>
  );
}
