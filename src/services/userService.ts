

import mockNetworkClient, { MockNetworkClient } from '../lib/mockNetworkClient';
import { ApiResponse, MockRequestOptions } from '../types/api';
import userResponses from '../ApiMocks';

export interface UserDetails {
  name: string;
  age: number;
  height: number;
  weight: number;
}

export interface UserDetailsResponse {
  user: UserDetails;
}

export class UserService {
  private client: MockNetworkClient;

  constructor(client: MockNetworkClient = mockNetworkClient) {
    this.client = client;
  }

  public async getUserDetails(
    options?: MockRequestOptions<UserDetailsResponse>,
  ): Promise<ApiResponse<UserDetailsResponse>> {
    const defaultData: UserDetailsResponse = userResponses.getUserSuccess.data;

    return this.client.get<UserDetailsResponse>(
      '/api/v1/user',
      defaultData,
      options,
    );
  }

  public async updateUserDetails(
    updatedUser: UserDetails,
    options?: MockRequestOptions<UserDetailsResponse>,
  ): Promise<ApiResponse<UserDetailsResponse>> {
    const responseData: UserDetailsResponse = { user: updatedUser };

    return this.client.post<UserDetailsResponse>(
      '/api/v1/user',
      { user: updatedUser },
      responseData,
      options,
    );
  }
}

export const userService = new UserService();
export default userService;
