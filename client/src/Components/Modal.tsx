import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Icon } from '@iconify/react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { getUserInfo } from '../util/UserApi';
import ModalSample from '../img/modalSample.svg';
import UserImg1 from '../img/UserImg1.png';
import color from '../util/color';
import { CProps } from '../Map/Marker';
import { mapReviewEdit, mapReviewUPDATE, mapReviewDELETE } from '../util/MapApi';
import headers from '../util/headers';
import load from '../img/paw.gif';

const { ivory, lightgrey, brown, darkbrown, bordergrey, yellow, mediumgrey } = color;
const url = process.env.REACT_APP_API_ROOT;
const petId = localStorage.getItem('petId') as string;

interface IReqData {
  petId: number;
  infoMapId: number;
}

interface ResponseData {
  petInfo: petInfo;
}

interface petInfo {
  petName: string;
  profileImage: File | null;
}

interface IReview {
  petId: number;
  commentId: number;
  profileImage: string;
  petName: string;
  contents: string;
  createdAt: string;
}

interface UserInfo {
  petName: string;
  profileImage: File | null;
}

interface FormData {
  profileImage: Blob | null;
}

interface MapData {
  details: {
    infoUrl: string;
    name: string;
    mapAddress: string;
    category: string;
    operationTime: string;
    tel: string;
    homepage: string;
    myPick: boolean;
  };

  reviews: IReview[] | null;

  pageInfo: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

const Modal = ({ click, setClick, id, bookmark }: CProps['clicks']) => {
  const [resData, setResData] = useState<object | null>(null);
  const [review, setReview] = useState<string>('');
  const [editReview, setEditReview] = useState<string>('');
  const [editActivate, setEditActivate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [test, setTest] = useState<number>(0);
  const [myPick, setMyPick] = useState<boolean>(bookmark);
  const [mapdata, setMapdata] = useState<MapData>({
    details: {
      infoUrl: 'url.png',
      name: 'test',
      mapAddress: 'test',
      category: 'test',
      operationTime: '0900-1800',
      tel: '02-555-8888',
      homepage: 'test.com',
      myPick: false,
    },
    reviews: [],
    pageInfo: {
      page: 1,
      size: 15,
      totalElements: 0,
      totalPages: 1,
    },
  });
  const petId = localStorage.getItem('petId') as string;
  const { responseData, error } = getUserInfo(petId);
  const [info, setInfo] = useState<UserInfo>({
    petName: '',
    profileImage: null,
  });

  const [formData, setFormData] = useState<FormData>({ profileImage: null });
  const [count, setCount] = useState<number>(0);

  if (!error && responseData && count === 0) {
    const { petInfo } = responseData as ResponseData;
    const { petName, profileImage } = petInfo;
    setInfo({ ...info, petName: petName });
    setFormData({ profileImage: profileImage });
    setCount(count + 1);
  }

  const UserImg = formData.profileImage as unknown as string;

  useEffect(() => {
    getData();
  }, [test]);

  async function getData() {
    setLoading(true);
    await delay(1000);

    await axios
      .get(`${url}/maps/details/${id}`, { headers })
      .then((res) => {
        setResData(res.data);
        setMapdata(res.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function delay(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  const bookmarkHandler = () => {
    const reqData: IReqData = {
      petId: Number(petId),
      infoMapId: id,
    };
    if (myPick) {
      deletePlace(reqData);
      setMyPick(false);
    } else {
      addPlace(reqData);
      setMyPick(true);
    }
  };

  async function addPlace(reqData: IReqData) {
    await axios.post(`${url}/maps/addplace`, JSON.stringify(reqData), { headers });
  }

  async function deletePlace(reqData: IReqData) {
    await axios.delete(`${url}/maps/cancel`, {
      data: reqData,
      headers,
    });
  }

  const selectHandler = () => {
    setClick(!click);
  };

  const reviewHandler = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setReview((e.target as HTMLInputElement).value);
  };
  const editReviewHandler = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEditReview((e.target as HTMLInputElement).value);
  };

  const reviewPostHandler = () => {
    setTest(test + 1);
    mapReviewEdit(id, review);
    if (review === '') {
      Swal.fire({
        position: 'center',
        icon: 'warning',
        iconHtml: '⚠',
        title: '내용을 입력해주세요. ',
        color: brown,
        padding: '20px 0px 40px 0px',
      });
      return;
    } else {
      Swal.fire({
        position: 'center',
        icon: 'warning',
        iconHtml: '🐾',
        title: '작성되었습니다.',
        color: brown,
        padding: '20px 0px 40px 0px',
        showConfirmButton: false,
        timer: 1500,
      });
      setReview('');
    }
  };
  const reviewUpdateHandler = (commentId: number) => {
    if (editReview === '') {
      Swal.fire({
        position: 'center',
        icon: 'warning',
        iconHtml: '⚠',
        title: '내용을 입력해주세요. ',
        color: brown,
        padding: '20px 0px 40px 0px',
      });
      return;
    } else {
      Swal.fire({
        title: '정말 수정하시겠어요?',
        icon: 'warning',
        showCancelButton: true,
        color: brown,
        confirmButtonColor: yellow,
        cancelButtonColor: bordergrey,
        confirmButtonText: '<b>확인</b>',
        cancelButtonText: '<b>취소</b>',
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: '수정되었습니다.',
            icon: 'success',
            color: brown,
            confirmButtonColor: yellow,
            confirmButtonText: '<b>확인</b>',
          });
          mapReviewUPDATE(commentId, editReview);
          setEditActivate(0);
          setTest(test + 1);
        }
      });
      setEditReview('');
    }
  };

  const reviewDeleteHandler = (commentId: number) => {
    Swal.fire({
      title: '정말 삭제하시겠어요?',
      icon: 'warning',
      showCancelButton: true,
      color: brown,
      confirmButtonColor: yellow,
      cancelButtonColor: bordergrey,
      confirmButtonText: '<b>확인</b>',
      cancelButtonText: '<b>취소</b>',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: '삭제되었습니다.',
          icon: 'error',
          color: brown,
          confirmButtonColor: yellow,
          confirmButtonText: '<b>확인</b>',
        });
        mapReviewDELETE(commentId);
        setTest(test + 1);
      }
    });
  };
  const reviewActivateHandler = (commentId: number) => {
    setEditActivate(commentId);
  };

  const reviewEditCancelHandler = () => {
    setEditActivate(0);
    setEditReview('');
  };
  return (
    <div>
      {mapdata.reviews !== null ? (
        <Container onClick={(e) => e.stopPropagation()}>
          {loading ? (
            <Loading>
              <img className='load' src={load}></img>
            </Loading>
          ) : (
            <FlexBox>
              <InfoDiv>
                <Image src={mapdata.details.infoUrl} />

                <InfoTitleBox>
                  <InfoTitle>{mapdata.details.name}</InfoTitle>
                  <InfoSubTitle>{mapdata.details.category}</InfoSubTitle>
                  <BookmarkButton onClick={bookmarkHandler}>
                    {myPick === false ? (
                      <Icon
                        icon='ic:round-star-outline'
                        color={brown}
                        style={{ fontSize: '30px' }}
                      />
                    ) : (
                      <Icon icon='ic:round-star' color={yellow} style={{ fontSize: '30px' }} />
                    )}
                  </BookmarkButton>
                </InfoTitleBox>
                <InfoContentBox>
                  <Icon icon='mdi:map-marker' color={brown} style={{ fontSize: '30px' }} />
                  <InfoContent>{mapdata.details.mapAddress}</InfoContent>
                </InfoContentBox>
                <InfoContentBox>
                  <Icon
                    icon='ic:round-access-time-filled'
                    color={brown}
                    style={{ fontSize: '30px' }}
                  />
                  {mapdata.details.operationTime === null ? (
                    <NullData>이용시간을 알려주세요.</NullData>
                  ) : (
                    <InfoContent>{mapdata.details.operationTime}</InfoContent>
                  )}
                </InfoContentBox>
                <InfoContentBox>
                  <Icon icon='material-symbols:call' color={brown} style={{ fontSize: '30px' }} />
                  {mapdata.details.tel === null ? (
                    <NullData>전화번호를 알려주세요.</NullData>
                  ) : (
                    <InfoContent>{mapdata.details.tel}</InfoContent>
                  )}
                </InfoContentBox>
                <InfoContentBox>
                  <Icon icon='material-symbols:home' color={brown} style={{ fontSize: '30px' }} />
                  {mapdata.details.homepage === null ? (
                    <NullData>홈페이지를 알려주세요.</NullData>
                  ) : (
                    <div className='urlBox'>
                      <Linka href={mapdata.details.homepage} target='_blank'>
                        {mapdata.details.homepage}
                      </Linka>
                    </div>
                  )}
                </InfoContentBox>
              </InfoDiv>

              <ReviewBox>
                <ReviewTitle>리뷰</ReviewTitle>
                <Reviews>
                  {mapdata.reviews.length === 0 ? (
                    <EmptyMessage>
                      리뷰가 없어요.. <br />첫 번째 리뷰를 남겨주세요 🐾
                    </EmptyMessage>
                  ) : (
                    mapdata.reviews.map((el: any, idx: number) => {
                      return (
                        <Review key={idx}>
                          {el.commentId !== editActivate ? (
                            <ReviewWrite>
                              <ReviewUserBox>
                                <ReviewUserImage src={el.profileImage} />
                                <ReviewUserName>{el.petName}</ReviewUserName>
                              </ReviewUserBox>
                              <ReviewTextBox>
                                <ReviewText>
                                  {el.contents}
                                  {el.petId === Number(petId) ? (
                                    <EditDelButtons>
                                      <button onClick={() => reviewActivateHandler(el.commentId)}>
                                        <Icon icon='mdi:pencil' style={{ fontSize: '15px' }} />
                                      </button>
                                      <button onClick={() => reviewDeleteHandler(el.commentId)}>
                                        <Icon
                                          icon='material-symbols:delete-outline-rounded'
                                          style={{ fontSize: '15px' }}
                                        />
                                      </button>
                                    </EditDelButtons>
                                  ) : (
                                    ''
                                  )}
                                </ReviewText>
                                <ReviewDate>{el.createdAt}</ReviewDate>
                              </ReviewTextBox>
                            </ReviewWrite>
                          ) : (
                            <ReviewWrite>
                              <ReviewUserBox>
                                <ReviewUserImage src={el.profileImage} />
                                <ReviewUserName>{el.petName}</ReviewUserName>
                              </ReviewUserBox>
                              <ReviewInputTextBox>
                                <ReviewInputBox>
                                  <ReviewInput
                                    type='text'
                                    placeholder={el.contents}
                                    onChange={editReviewHandler}
                                    id='basereview'
                                  ></ReviewInput>
                                </ReviewInputBox>
                                <ReviewButton onClick={() => reviewUpdateHandler(el.commentId)}>
                                  <Icon
                                    icon='mdi:check-bold'
                                    color='#ffc57e'
                                    style={{ fontSize: '20px' }}
                                  />
                                </ReviewButton>
                                <ReviewEditCancelButton onClick={reviewEditCancelHandler}>
                                  <Icon
                                    icon='mdi:cancel-bold'
                                    color='#f79483'
                                    style={{ fontSize: '22px' }}
                                  />
                                </ReviewEditCancelButton>
                              </ReviewInputTextBox>
                            </ReviewWrite>
                          )}
                        </Review>
                      );
                    })
                  )}
                </Reviews>
              </ReviewBox>
              <ReviewWrite>
                <ReviewUserBox>
                  <ReviewUserImage src={UserImg} />
                  <ReviewUserName>{info.petName}</ReviewUserName>
                </ReviewUserBox>
                <ReviewInputTextBox>
                  <ReviewInputBox>
                    <ReviewInput
                      type='text'
                      placeholder='이 공간이 어땠나요?'
                      onChange={reviewHandler}
                    />
                  </ReviewInputBox>
                  <ReviewButton onClick={reviewPostHandler}>작성</ReviewButton>
                </ReviewInputTextBox>
              </ReviewWrite>
              <CloseBox onClick={selectHandler}>
                <Icon
                  className='close'
                  icon='material-symbols:arrow-back-ios-rounded'
                  color='#FFF8F0'
                  style={{ fontSize: '45px' }}
                />
              </CloseBox>
            </FlexBox>
          )}
        </Container>
      ) : (
        <div>로딩중!</div>
      )}
    </div>
  );
};

const Container = styled.div`
  width: 350px;
  height: 100vh;
  position: relative;
  z-index: 100;
  box-shadow: rgba(149, 157, 165, 0.8) 14px 0px 14px -14px;
  background-color: white;
`;

const Loading = styled.div`
  background-color: #fdfcfc;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;

  .load {
    width: 100px;
    height: 100px;
  }
`;

const FlexBox = styled.div`
  display: flex;
  flex-direction: column;
`;

const InfoDiv = styled.div`
  width: 100%;
  background: ${ivory};
  border-bottom: 1px solid ${bordergrey};
`;

const Image = styled.img`
  width: 350px;
  height: 226px;
  background-size: cover;
  object-fit: cover;
`;

const InfoTitleBox = styled.div`
  padding: 14px 0px 14px 0px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const InfoTitle = styled.div`
  color: ${brown};
  font-size: 18px;
  font-weight: Bold;
  margin-right: 10px;
`;

const InfoSubTitle = styled.div`
  font-size: 14px;
  margin-right: 10px;
  color: ${lightgrey};
`;

const BookmarkButton = styled.button`
  all: unset;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 3px;
  cursor: pointer;
`;
const InfoContentBox = styled.div`
  display: flex;
  padding: 11px 15px 11px 18px;

  &:last-child {
    margin-bottom: 3px;
  }

  .urlBox {
    width: 270px;
    display: flex;
    align-items: center;
  }
`;
const InfoContent = styled.div`
  font-size: 14px;
  font-weight: bold;
  color: ${brown};
  margin-left: 13px;
  display: flex;
  align-items: center;
`;

const InfoAnchor = styled.a`
  font-size: 14px;
  font-weight: 500;
  color: #5b8a72;
  margin-left: 13px;
  display: flex;
  align-items: center;
  cursor: pointer;

  &:hover {
    color: #357a57;
  }
`;

const ReviewBox = styled.div`
  background-color: white;
`;
const Reviews = styled.div`
  height: calc(100vh - 537px - 50px - 100px);
  overflow-y: scroll;
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background-color: #dccdc8;
    border-radius: 100px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: #a9908d;
    border-radius: 100px;
  }
`;

const Review = styled.div`
  width: 100%;
  min-height: 90px;
  display: flex;
`;

const ReviewTitle = styled.div`
  color: ${brown};
  font-weight: 900;
  padding: 15px 19px;
`;

const ReviewUserBox = styled.div`
  width: 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const ReviewUserImage = styled.img`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-size: cover;
`;

const ReviewUserName = styled.div`
  margin-top: 8px;
  color: ${brown};
  font-size: 14px;
  font-weight: Bold;
`;

const ReviewTextBox = styled.div`
  padding: 20px 15px 20px 10px;
  width: calc(100% - 70px);
  min-height: 80px;
`;

const ReviewText = styled.div`
  width: 100%;
  height: 100%;
  color: ${brown};
  font-size: 14px;
  font-weight: 500;

  display: flex;
  justify-content: space-between;
`;

const ReviewDate = styled.div`
  text-align: end;
  color: ${lightgrey};
  font-size: 11px;
  margin-right: 7px;
`;

const ReviewInputBox = styled.div`
  flex-grow: 1;
  color: ${brown};
  font-size: 14px;
  font-weight: 500;
`;

type Props = {
  type: string;
  placeholder: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const ReviewInput = styled.input<Props>`
  padding: 10px;
  width: 100%;
  height: 50px;
  font-size: 14px;
  color: ${brown};
  border: 1px solid ${bordergrey};
  border-radius: 15px;
  resize: none;

  &:focus {
    outline: 1px solid ${bordergrey};
  }
  &::placeholder {
    color: ${lightgrey};
  }
`;
const ReviewButton = styled.button`
  margin-left: 4px;
  margin-right: 4px;
  padding: 7px 10px;
  font-weight: bold;
  background: ${brown};
  border-radius: 12px;
  border: 0;
  color: white;
  cursor: pointer;

  &:hover {
    background-color: ${darkbrown};
  }
`;
const ReviewInputTextBox = styled.div`
  padding: 10px;
  width: calc(100% - 70px);
  display: flex;
  align-items: center;
`;

const CloseBox = styled.div`
  position: fixed;
  z-index: 999;
  top: 48%;
  left: 357px;
  bottom: 0;
  right: 0;
  opacity: 0.8;
  .close {
    cursor: pointer;
  }
`;

const ReviewWrite = styled.div`
  width: 100%;
  height: 100px;
  display: flex;
  background-color: white;
`;

const EmptyMessage = styled.div`
  margin-top: 35px;
  text-align: center;
  font-size: 14px;
  color: ${brown};
`;

const EditDelButtons = styled.div`
  display: flex;
  flex-direction: column;

  button {
    padding: 5px;
    border: transparent;
    border-radius: 5px;
    color: ${lightgrey};
    background: none;
    cursor: pointer;
    line-height: 0px;

    &:hover {
      color: ${yellow};
      background-color: ${ivory};
    }
  }
`;

const ReviewEditCancelButton = styled.button`
  padding: 7px 10px;
  font-weight: bold;
  background: ${ivory};
  border-radius: 12px;
  border: 1px solid ${bordergrey};
  color: white;
  cursor: pointer;

  &:hover {
    background-color: ${darkbrown};
  }
`;

const NullData = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${mediumgrey};
  margin-left: 13px;
  display: flex;
  align-items: center;
`;

const Linka = styled.a`
  font-size: 14px;
  font-weight: bold;
  color: ${yellow};
  margin-left: 13px;
  display: flex;
  align-items: center;
  text-decoration: underline;
  word-break: break-all;
`;

export default Modal;
